const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const { Op } = require('sequelize');

class seriesNumberService {
  constructor() {}

  // Busca series activas por tipo (Borradores y Registros)
  async findByType(type) {
    const today = new Date().toISOString().split('T')[0];

    return await models.seriesNumber.findAll({
      where: {
        type: type,
        fromDate: { [Op.lte]: today },
        toDate: { [Op.gte]: today }
      },
      // Incluimos postingSerie explícitamente para que el front lo capture en el dataset
      attributes: [
        'type',
        'startSerie',
        'postingSerie',
        'description',
        'prefix',
        'lastNumber',
        'digits'
      ],
      order: [['startSerie', 'ASC']]
    });
  }

  async findPaginated({ limit, offset, type }) {
    const options = {
      where: {},
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      order: [['createdAt', 'DESC']]
    };

    if (type) options.where.type = type;

    const { count, rows } = await models.seriesNumber.findAndCountAll(options);
    return {
      total: count,
      series: rows
    };
  }

  async findOne(type, startSerie) {
    const serieNumber = await models.seriesNumber.findOne({
      where: { type, startSerie }
    });
    if (!serieNumber) throw boom.notFound('Serie no encontrada');
    return serieNumber;
  }

  async create(data) {
    // Sequelize se encargará de mapear postingSerie al campo posting_serie de la BD
    return await models.seriesNumber.create(data);
  }

  async update(type, startSerie, changes) {
    // Al no usar "this", llamamos directamente al modelo para localizarlo
    const serie = await models.seriesNumber.findOne({
      where: { type, startSerie }
    });
    if (!serie) throw boom.notFound('Serie no encontrada');

    return await serie.update(changes);
  }

  async delete(type, startSerie) {
    const serie = await models.seriesNumber.findOne({
      where: { type, startSerie }
    });
    if (!serie) throw boom.notFound('Serie no encontrada');

    await serie.destroy();
    return { type, startSerie, message: 'Serie eliminada correctamente' };
  }
}

module.exports = seriesNumberService;
