const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const { Op } = require('sequelize');

class seriesNumberService {
  constructor() {}

  async find(queryParams) {
    const whereClause = {};
    if (queryParams.type) whereClause.type = queryParams.type;
    return await models.seriesNumber.findAll({ where: whereClause });
  }

  async findPaginated({ limit, offset, serieNoStart, serieNoType }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['startSerie', 'ASC']],
      where: {},
    };

    if (serieNoStart) {
      options.where.startSerie = { [Op.iLike]: `%${serieNoStart}%` };
    }
    if (serieNoType) {
      options.where.type = { [Op.iLike]: `%${serieNoType}%` };
    }

    try {
      const { count, rows } = await models.seriesNumber.findAndCountAll(options);
      return {
        seriesNo: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar números de serie paginados', error);
    }
  }

  async findOne(type, startSerie) {
    const serieNumber = await models.seriesNumber.findOne({
      where: { type, startSerie }
    });
    if (!serieNumber) throw boom.notFound('Serie no encontrada');
    return serieNumber;
  }

  // Creación simple: El hook de auditoría inyectará el username si lo tienes configurado
  async create(data) {
    return await models.seriesNumber.create(data);
  }

  // Actualización limpia de los nuevos campos
  async update(type, startSerie, changes) {
    const model = await this.findOne(type, startSerie);
    return await model.update(changes);
  }

  async delete(type, startSerie) {
    const model = await this.findOne(type, startSerie);
    await model.destroy();
    return { message: 'Serie eliminada correctamente' };
  }
}

module.exports = seriesNumberService;
