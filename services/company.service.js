const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { parsePagination, pageResult } = require('../libs/pagination');
const { models } = require('../libs/sequelize');
const logger = require('../libs/logger');

class CompanyService {

  constructor() { }

  async find(query) {
    const options = {
      where: {}
    }

    const { limit, offset } = query;
    // Opcional: sin limit se devuelve todo (listas cortas de configuración)
    if (limit) Object.assign(options, parsePagination(limit, offset));

    const company = await models.Company.findAll(options);
    return company;
  }

  /**
   * Búsqueda avanzada con paginación y filtrado por término.
   */
  async findPaginated({ limit, offset, searchTerm }) {
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(limit, offset);

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

      return pageResult(rows, count, parsedOffset);
    } catch (error) {
      logger.error(`CompanyService.findPaginated: ${error.message}`, { stack: error.stack });
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
