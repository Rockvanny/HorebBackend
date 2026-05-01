const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class CompanyService {

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

    const company = await models.Company.findAll(options);
    return company;
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
      order: [['id', 'ASC']],
      where: {},
    }

    if (searchTerm) {
      const term = searchTerm.trim();
      const searchPattern = `%${term}%`;

      // Quitamos el ID de aquí para que no de error
      options.where[Op.or] = [
        { vatRegistration: { [Op.iLike]: searchPattern } },
        { name: { [Op.iLike]: searchPattern } }
      ];
    }

    try {
      const { count, rows } = await models.Company.findAndCountAll(options);

      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en CompanyService.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar empresa paginados');
    }
  }

  async findOne(id) {
    const queryOptions = {};

    const company = await models.Company.findByPk(id, queryOptions);
    if (!company) {
      throw boom.notFound('Empresa no encontrada');
    }
    return company;
  }

  async create(data) {
    const newCompany = await models.Company.create(data);
    return newCompany;
  }

  // Este método necesita obtener un producto existente para actualizarlo.
  // Por lo tanto, debe utilizar el propio método 'this.findOne()' del servicio.
  async update(code, changes) {
    console.log(`\n--- DEBUG: Dentro de CompanyService.update(${code}, changes) ---`);
    const company = await this.findOne(code);

    const updatedCompany = await company.update(changes);
    return updatedCompany;
  }

  async delete(id) {
    const companyToDelete = await this.findOne(id);

    // Usamos el id que encontramos para asegurar consistencia
    await companyToDelete.destroy();

    return { id };
  }

}

module.exports = CompanyService;
