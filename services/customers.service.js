const crypto = require('crypto');
const { Op, fn, col } = require('sequelize');
const boom = require('@hapi/boom');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('../libs/sequelize');
const { getConfig } = require('../config/config');
const { maskEmail } = require('../libs/maskEmail');
const OtpService = require('./otp.service');
const logger = require('../libs/logger');

const config = getConfig();
const otpService = new OtpService();

// Propósito propio para el login de clientes: distinto al 'LOGIN_2FA' de
// empleados (user.service.js) para que un reto de uno no pueda verificarse
// como si fuera del otro (assertUsable en otp.service.js compara 'purpose').
const CUSTOMER_LOGIN_OTP_PURPOSE = 'CUSTOMER_LOGIN_2FA';
// Mismo razonamiento para el reseteo de contraseña: distinto de 'PASSWORD_RESET'
// (user.service.js) por si algún día un código de cliente coincidiera con uno
// de empleado.
const CUSTOMER_PASSWORD_RESET_PURPOSE = 'CUSTOMER_PASSWORD_RESET';

// Tipos de factura que suman al saldo; las rectificativas (R1-R5) restan.
const INVOICED_TYPES = ['F1', 'F2'];
const RECTIFICATION_TYPES = ['R1', 'R2', 'R3', 'R4', 'R5'];

// SQLSTATE de Postgres para "la tabla no existe". Mientras el módulo de
// facturación no esté activo (su migración sigue en .bak durante el
// desarrollo por módulos), degradamos a saldo 0 en vez de romper cualquier
// pantalla que liste o abra un cliente. Cualquier OTRO error de BD (typo en
// una columna, permisos, etc.) se sigue propagando tal cual.
const UNDEFINED_TABLE = '42P01';

class CustomerService {

  constructor() { }

  /**
   * Calcula, sin persistir nada, el saldo facturado (F1/F2 netas de
   * rectificativas) y el saldo pendiente (mismo cálculo, restringido a
   * facturas registradas en estado 'Abierto') para un conjunto de clientes.
   * Se recalcula contra `sales_post_invoices` en cada consulta: si algo
   * cambia una factura, el saldo ya sale correcto la próxima vez que se lea,
   * sin necesidad de mantener ningún hook de sincronización.
   */
  async #computeBalances(customerCodes) {
    const balances = {};
    customerCodes.forEach(code => {
      balances[code] = { saldoFacturado: 0, saldoPendiente: 0 };
    });

    if (!customerCodes.length) return balances;

    let rows;
    try {
      rows = await models.salesPostInvoice.findAll({
        attributes: [
          'entityCode',
          'typeInvoice',
          'status',
          [fn('SUM', col('amount_with_vat')), 'total']
        ],
        where: { entityCode: { [Op.in]: customerCodes } },
        group: ['entityCode', 'typeInvoice', 'status'],
        raw: true
      });
    } catch (error) {
      if (error.original?.code === UNDEFINED_TABLE || error.parent?.code === UNDEFINED_TABLE) {
        logger.error('CustomerService#computeBalances: sales_post_invoices no existe todavía, devolviendo saldos en 0.');
        return balances;
      }
      throw error;
    }

    rows.forEach(row => {
      // Tipos de factura fuera de F1/F2/R1-R5 (si los hubiera en el futuro)
      // no se contabilizan hasta decidir explícitamente cómo tratarlos.
      const isInvoiced = INVOICED_TYPES.includes(row.typeInvoice);
      const isRectification = RECTIFICATION_TYPES.includes(row.typeInvoice);
      if (!isInvoiced && !isRectification) return;

      const total = parseFloat(row.total) || 0;
      const signedTotal = isRectification ? -total : total;

      balances[row.entityCode].saldoFacturado += signedTotal;
      if (row.status === 'Abierto') {
        balances[row.entityCode].saldoPendiente += signedTotal;
      }
    });

    return balances;
  }

  /**
   * Saldo facturado/pendiente de un único cliente (usado por el endpoint de
   * detalle). Devuelve {saldoFacturado, saldoPendiente}, ambos en 0 si el
   * cliente no tiene facturas registradas todavía.
   */
  async getBalances(code) {
    const balances = await this.#computeBalances([code]);
    return balances[code];
  }

  /**
   * Convierte una lista de instancias Customer en objetos planos con
   * `saldoFacturado`/`saldoPendiente` añadidos (una sola query agregada
   * para todo el lote, no una por cliente).
   */
  async #attachBalances(customers) {
    if (!customers.length) return [];

    const codes = customers.map(c => c.code);
    const balances = await this.#computeBalances(codes);

    return customers.map(c => ({
      ...c.toJSON(),
      ...balances[c.code]
    }));
  }

  /**
   * Obtiene todos los clientes con filtros opcionales de paginación.
   */
  async find(query) {
    const options = {
      where: {}
    }

    const { limit, offset } = query;
    if (limit && offset) {
      options.limit = parseInt(limit, 10);
      options.offset = parseInt(offset, 10);
    }

    const customers = await models.Customer.findAll(options);
    return this.#attachBalances(customers);
  }

  /**
   * Búsqueda avanzada con paginación y filtrado por término.
   */
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['code', 'ASC']],
      where: {},
    }

    if (searchTerm) {
      const term = searchTerm.trim();
      const searchPattern = term.includes('%') ? term : `%${term}%`;

      options.where[Op.or] = [
        { code: { [Op.iLike]: searchPattern } },
        { nif: { [Op.iLike]: searchPattern } },
        { name: { [Op.iLike]: searchPattern } }
      ];
    }

    try {
      const { count, rows } = await models.Customer.findAndCountAll(options);

      return {
        records: await this.#attachBalances(rows),
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en CustomerService.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar clientes paginados');
    }
  }

  /**
   * Obtiene un único cliente por su PK (code).
   */
  async findOne(code, includeDocuments = false) {
    const queryOptions = {};

    if (includeDocuments) {
      queryOptions.include = [
        {
          model: models.salesBudget,
          as: 'salesBudget',
          attributes: ['code']
        },
        {
          model: models.salesInvoice,
          as: 'salesInvoice',
          attributes: ['code']
        },
        {
          model: models.salesPostInvoice,
          as: 'salesPostInvoice',
          attributes: ['code']
        },
      ];
    }

    const customer = await models.Customer.findByPk(code, queryOptions);
    if (!customer) {
      throw boom.notFound('Cliente no encontrado');
    }
    return customer;
  }

  /**
   * Búsqueda rápida de clientes (limitada a 10 resultados).
   */
  async search(searchTerm) {
    const term = searchTerm ? searchTerm.trim() : '';
    if (!term) return [];

    const searchPattern = `%${term}%`;

    const options = {
      where: {
        [Op.or]: [
          { code: { [Op.iLike]: searchPattern } },
          { nif: { [Op.iLike]: searchPattern } },
          { name: { [Op.iLike]: searchPattern } }
        ]
      },
      limit: 10,
      order: [['code', 'ASC']],
      raw: true
    };

    try {
      return await models.Customer.findAll(options);
    } catch (error) {
      console.error("Error en el servicio de búsqueda:", error);
      return [];
    }
  }

  /**
   * CREAR: Envía 'userExecutor' en las opciones para el Hook Global.
   */
  async create(data, userExecutor) {
    // 1. Iniciamos la transacción
    const t = await models.Customer.sequelize.transaction();

    try {
      // 2. Pasamos la transacción en las opciones
      const newCustomer = await models.Customer.create(data, {
        transaction: t,
        userExecutor // Tu auditoría sigue funcionando igual
      });

      // 3. Si todo sale bien, confirmamos (aquí se quema el número oficialmente)
      await t.commit();
      return newCustomer;

    } catch (error) {
      // 4. SI HAY ERROR, SE HACE ROLLBACK
      // El número de serie vuelve a su estado anterior como si nada hubiera pasado
      await t.rollback();
      throw error;
    }
  }

  /**
   * ACTUALIZAR: Usa findOne y luego aplica los cambios con auditoría.
   */
  async update(code, changes, userExecutor) {
    const customer = await this.findOne(code);

    // El segundo parámetro de update (en instancia) son las opciones
    return await customer.update(changes, {
      userExecutor // Asegúrate de que este valor no sea undefined
    });
  }

  /**
   * ELIMINAR: Validación de integridad referencial y borrado.
   */
  async delete(code, userExecutor) {
    // 1. Buscamos el cliente incluyendo los documentos (ya lo tienes configurado)
    const customer = await this.findOne(code, true);

    // 2. Extraemos la existencia de registros para mayor claridad
    const hasBudgets = customer.salesBudget?.length > 0;
    const hasInvoices = customer.salesInvoice?.length > 0;
    const hasPostInvoices = customer.salesPostInvoice?.length > 0;

    // 3. Validación de integridad: Si tiene CUALQUIERA de estos, lanzamos conflicto
    if (hasBudgets || hasInvoices || hasPostInvoices) {
      throw boom.conflict(
        'Operación denegada: El cliente tiene ofertas o facturas (borradores/registradas) asociadas.'
      );
    }

    // 4. Si la validación pasa, procedemos al borrado
    // Pasamos userExecutor por si tienes hooks de auditoría (afterDestroy)
    await customer.destroy({ userExecutor });

    return { code };
  }

  // ============================================================
  // AUTOSERVICIO DE CLIENTES (app móvil): alta + login en 2 pasos,
  // igual de forma que user.service.js pero contra 'customers'.
  // ============================================================

  /**
   * Alta de cuenta: el cliente ya tiene que existir (creado por el personal
   * interno al darlo de alta comercialmente) y no tener contraseña todavía.
   * Verificar por NIF+email evita que cualquiera se registre como si fuera
   * un cliente real solo por adivinar/conocer su código.
   */
  async registerAccount(nif, email, password) {
    const customer = await models.Customer.findOne({ where: { nif, email } });

    if (!customer) {
      throw boom.notFound('No se ha encontrado ningún cliente con ese NIF y email. Contacta con la empresa.');
    }
    if (!customer.appAccessEnabled) {
      throw boom.forbidden('Tu cuenta no tiene acceso habilitado a la aplicación. Contacta con la empresa.');
    }
    if (customer.password) {
      throw boom.conflict('Ya existe una cuenta para este cliente. Inicia sesión.');
    }

    // El hook beforeUpdate del modelo se encarga de encriptar.
    await customer.update({ password });
    return { code: customer.code };
  }

  /**
   * PASO 1 del login de cliente: valida email + contraseña y crea un reto OTP
   * (mismo mecanismo de 2FA que los empleados, ver otp.service.js).
   */
  async login(email, password) {
    const customer = await models.Customer.findOne({ where: { email } });

    if (!customer || !customer.password) {
      throw boom.unauthorized('Email o contraseña incorrectos');
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) throw boom.unauthorized('Email o contraseña incorrectos');

    // Después de validar credenciales a propósito -que no revele, solo con
    // el email, si una cuenta existe y tiene el acceso desactivado-.
    if (!customer.appAccessEnabled) {
      throw boom.forbidden('Tu cuenta no tiene acceso habilitado a la aplicación. Contacta con la empresa.');
    }

    return otpService.createChallenge(customer, CUSTOMER_LOGIN_OTP_PURPOSE);
  }

  /**
   * PASO 2: verifica el OTP y emite el JWT. `type: 'CUSTOMER'` en el payload
   * es lo que distingue este token de uno de empleado (ver
   * libs/customerJwt.strategy.js, que es la única estrategia que los acepta).
   */
  async verifyLoginOtp(challengeId, otp) {
    const customerCode = await otpService.verifyChallenge(challengeId, otp, CUSTOMER_LOGIN_OTP_PURPOSE);

    const customer = await models.Customer.findByPk(customerCode);
    if (!customer) throw boom.unauthorized('Cliente no encontrado');

    // Revalidado también aquí (no solo en login): si el acceso se revoca
    // mientras el OTP ya estaba en curso, no debe emitirse igualmente el token.
    if (!customer.appAccessEnabled) {
      throw boom.forbidden('Tu cuenta no tiene acceso habilitado a la aplicación. Contacta con la empresa.');
    }

    const token = jwt.sign({ sub: customer.code, type: 'CUSTOMER' }, config.jwtSecret, { expiresIn: '8h' });
    return { token };
  }

  async resendLoginOtp(challengeId) {
    return otpService.resendChallenge(challengeId, CUSTOMER_LOGIN_OTP_PURPOSE);
  }

  /**
   * PASO 1 del reseteo de contraseña sin sesión previa ("olvidé mi
   * contraseña"), igual que user.service.js#requestPasswordReset. Si el
   * email no corresponde a ningún cliente, devuelve una respuesta con la
   * misma forma (challengeId falso, sin crear reto ni enviar correo) para no
   * filtrar si un email está registrado o no.
   */
  async requestPasswordReset(email) {
    const customer = await models.Customer.findOne({ where: { email } });

    if (!customer) {
      return {
        challengeId: crypto.randomUUID(),
        expiresInSeconds: config.otpExpirationMinutes * 60,
        maskedEmail: maskEmail(email)
      };
    }

    return otpService.createChallenge(customer, CUSTOMER_PASSWORD_RESET_PURPOSE);
  }

  /**
   * PASO 2: verifica el OTP de reseteo y fija la nueva contraseña
   * directamente. No exige la contraseña actual: la prueba de identidad es
   * tener acceso al email.
   */
  async resetPassword(challengeId, code, newPassword) {
    const customerCode = await otpService.verifyChallenge(challengeId, code, CUSTOMER_PASSWORD_RESET_PURPOSE);

    const customer = await models.Customer.findByPk(customerCode);
    if (!customer) throw boom.unauthorized('Código inválido o expirado');

    // El hook beforeUpdate del modelo se encarga de encriptar.
    await customer.update({ password: newPassword });

    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Reenvía un nuevo código para un reto de reseteo de contraseña pendiente.
   */
  async resendPasswordReset(challengeId) {
    return otpService.resendChallenge(challengeId, CUSTOMER_PASSWORD_RESET_PURPOSE);
  }
}

module.exports = CustomerService;
