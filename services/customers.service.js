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
    // Al pasar userExecutor en el objeto de opciones, el hook beforeSave lo procesa
    const newCustomer = await models.Customer.create(data, {
      userExecutor
    });
    return newCustomer;
  }

  /**
   * ACTUALIZAR: Usa findOne y luego aplica los cambios con auditoría.
   */
  async update(code, changes, userExecutor) {
    const customer = await this.findOne(code);

    // El segundo parámetro de update (en instancia) son las opciones
    const updatedCustomer = await customer.update(changes, {
      userExecutor
    });

    return updatedCustomer;
  }

  /**
   * ELIMINAR: Validación de integridad referencial y borrado.
   */
  async delete(code, userExecutor) {
    // Buscamos incluyendo documentos para la validación
    const customer = await this.findOne(code, true);

    // Validación de integridad
    if (
      (customer.salesBudget && customer.salesBudget.length > 0) ||
      (customer.salesInvoice && customer.salesInvoice.length > 0) ||
      (customer.salesPostInvoice && customer.salesPostInvoice.length > 0)
    ) {
      throw boom.conflict('No se puede eliminar: el cliente tiene documentos contables vinculados.');
    }

    // Ejecución del Borrado (pasando el ejecutor por si se requiere en hooks de destroy)
    await customer.destroy({ userExecutor });

    return { code };
  }
}

module.exports = CustomerService;
