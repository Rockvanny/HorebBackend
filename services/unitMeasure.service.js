const { models } = require('../libs/sequelize');
const boom = require('@hapi/boom');

class UnitMeasureService {
  constructor() {
  }

  async find(queryParams) {
    console.log("Parametros recibidos en find() ", queryParams);
    const whereClause = {};

    if (queryParams.type) {
      whereClause.type = queryParams.type; // Aplica el filtro solo si "type" está presente
    }

    const rta = await models.UnitMeasure.findAll({ where: whereClause });
    return rta;
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

    try {
      const { count, rows } = await models.UnitMeasure.findAndCountAll(options);

      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en UnitMeasureService.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar unidades de medida paginados', error);
    }
  }


  async findOne(code) {
    return await models.UnitMeasure.findByPk(code);
  }

  async create(data) {
    return await models.UnitMeasure.create(data);
  }

  async update(code, changes) {
    const instance = await models.UnitMeasure.findOne(code);
    if (!instance) throw boom.notFound('UnitMeasure not found');
    return await instance.update(changes);
  }

  async delete(code) {
    const instance = await models.UnitMeasure.findOne(code);
    if (!instance) throw boom.notFound('UnitMeasure not found');
    await instance.destroy();
    return { code };
  }
}

module.exports = UnitMeasureService;
