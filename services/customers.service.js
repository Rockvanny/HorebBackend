const { Op, fn, col } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const logger = require('../libs/logger');

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
}

module.exports = CustomerService;
