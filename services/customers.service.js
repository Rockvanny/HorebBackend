const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class CustomerService {

  constructor() { }

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
    return customers;
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
        records: rows,
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
