const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const { Op } = require('sequelize');

class seriesNumberService {
  constructor() {}

  // NUEVO MÉTODO: Para el selector del Frontend
  async findByType(type) {
    const today = new Date().toISOString().split('T')[0]; // Fecha actual YYYY-MM-DD

    return await models.seriesNumber.findAll({
      where: {
        type: type,
        from_date: { [Op.lte]: today }, // from_date <= hoy
        to_date: { [Op.gte]: today }    // to_date >= hoy
      },
      order: [['startSerie', 'ASC']]
    });
  }

  // ... (resto de métodos: findPaginated, create, etc., se mantienen igual)
  async findPaginated({ limit, offset, serieNoStart, serieNoType }) {
    // Tu código actual...
  }

  async findOne(type, startSerie) {
    const serieNumber = await models.seriesNumber.findOne({
      where: { type, startSerie }
    });
    if (!serieNumber) throw boom.notFound('Serie no encontrada');
    return serieNumber;
  }

  async create(data) {
    return await models.seriesNumber.create(data);
  }

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
