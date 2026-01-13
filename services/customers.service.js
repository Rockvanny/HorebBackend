const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class CustomerService {

  constructor() { }

  async find(query) {
    const options = {
      where: {}
    }

    const { limit, offset } = query;
    if (limit && offset) {
      options.limit = parseInt(limit, 10);
      options.offset = parseInt(offset, 10);
    }

    const customer = await models.Customer.findAll(options);
    return customer;
  }

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
      // 1. Limpiamos y preparamos el patrón de búsqueda
      const term = searchTerm.trim();
      // Si el usuario ya puso %, lo usamos tal cual; si no, le ponemos % a ambos lados
      const searchPattern = term.includes('%') ? term : `%${term}%`;

      // 2. Aplicamos el OR para todas las columnas relevantes
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
      throw boom.badImplementation('Error al consultar clientes paginados', error);
    }
  }

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

  async search(searchTerm) {
    // 1. Limpiamos espacios en blanco al inicio y al final
    const term = searchTerm ? searchTerm.trim() : '';
    if (!term) return [];

    // Usamos el comodín % a ambos lados para búsqueda parcial
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
      raw: true // Esto ayuda a que los resultados sean objetos planos más ligeros
    };

    try {
      const records = await models.Customer.findAll(options);
      return records;
    } catch (error) {
      console.error("Error en el servicio de búsqueda:", error);
      return [];
    }
  }

  async create(data) {
    const newCustomer = await models.Customer.create(data);
    return newCustomer;
  }

  // Este método necesita obtener un producto existente para actualizarlo.
  // Por lo tanto, debe utilizar el propio método 'this.findOne()' del servicio.
  async update(code, changes) {
    console.log(`\n--- DEBUG: Dentro de CustomerService.update(${code}, changes) ---`);
    const customer = await this.findOne(code);

    const updatedCustomer = await customer.update(changes);
    return updatedCustomer;
  }

  async delete(code) {
    // 1. Buscamos al cliente usando el objeto de opciones correcto
    const customer = await models.Customer.findOne({
      where: { code: code }, // <--- Esto es lo que faltaba
      include: [
        { model: models.salesBudget, as: 'salesBudget', attributes: ['code'] },
        { model: models.salesInvoice, as: 'salesInvoice', attributes: ['code'] },
        { model: models.salesPostInvoice, as: 'salesPostInvoice', attributes: ['code'] }
      ]
    });

    if (!customer) {
      throw new Error(`Cliente con código ${code} no encontrado`);
    }

    // 2. Validación de integridad
    // Nota: Asegúrate de que las asociaciones en el modelo estén bien definidas
    // para que estos arrays existan (aunque estén vacíos).
    if (
      (customer.salesBudget && customer.salesBudget.length > 0) ||
      (customer.salesInvoice && customer.salesInvoice.length > 0) ||
      (customer.salesPostInvoice && customer.salesPostInvoice.length > 0)
    ) {
      throw new Error(`No se puede eliminar: el cliente tiene documentos contables vinculados.`);
    }

    // 3. Ejecución del Borrado (Lógico si tienes paranoid: true)
    await customer.destroy();

    return { code };
  }
}

module.exports = CustomerService;
