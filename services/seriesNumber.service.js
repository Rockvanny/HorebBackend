const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const { Op } = require('sequelize');
const { SERIES_TYPES } = require('../db/models/SeriesNumber.model');

class seriesNumberService {
  constructor() {}

  /**
   * Helper: Traduce el string del front (ej: 'customer') al ID (1)
   */
  _getTypeId(typeStr) {
    // Si ya es un número (caso de uso interno), lo devolvemos
    if (Number.isInteger(typeStr)) return typeStr;
    const typeInfo = SERIES_TYPES[typeStr];
    if (!typeInfo) throw boom.badRequest(`Tipo de serie '${typeStr}' no válido`);
    return typeInfo.id;
  }

  /**
   * Lógica de incremento alfanumérico
   * "FV0009" -> "FV0010"
   */
  _incrementText(value) {
    const match = value.match(/(\d+)$/);
    if (!match) return value;

    const numberStr = match[0];
    const prefix = value.substring(0, value.length - numberStr.length);
    const nextNumber = parseInt(numberStr, 10) + 1;
    const nextNumberStr = nextNumber.toString().padStart(numberStr.length, '0');

    return prefix + nextNumberStr;
  }

  async findByType(typeStr) {
    const typeId = this._getTypeId(typeStr);
    const today = new Date().toISOString().split('T')[0];

    return await models.seriesNumber.findAll({
      where: {
        type: typeId,
        fromDate: { [Op.lte]: today },
        toDate: { [Op.gte]: today }
      },
      // Quitamos campos viejos, usamos los nuevos
      attributes: ['type', 'code', 'lastValue', 'postingSerie', 'description', 'fromDate', 'toDate'],
      order: [['code', 'ASC']]
    });
  }

  async findPaginated({ limit, offset, type, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 10;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      where: {},
      order: [['createdAt', 'DESC']]
    };

    // Si viene el string 'customer', filtramos por el ID 1
    if (type) {
      options.where.type = this._getTypeId(type);
    }

    if (searchTerm) {
      const term = searchTerm.trim();
      options.where[Op.or] = [
        { description: { [Op.iLike]: `%${term}%` } },
        { code: { [Op.iLike]: `%${term}%` } }
      ];
    }

    const { count, rows } = await models.seriesNumber.findAndCountAll(options);

    return {
      records: rows, // Aquí Sequelize inyectará 'typeLabel' gracias al Getter del modelo
      total: count,
      hasMore: (parsedOffset + rows.length) < count
    };
  }

  async findOne(typeStr, code) {
    const typeId = this._getTypeId(typeStr);
    const serieNumber = await models.seriesNumber.findOne({
      where: { type: typeId, code }
    });
    if (!serieNumber) throw boom.notFound('Serie no encontrada');
    return serieNumber;
  }

  async create(data, userExecutor) {
    const t = await models.seriesNumber.sequelize.transaction();
    try {
      // Traducimos el tipo antes de guardar
      const typeId = this._getTypeId(data.type);

      const newSerie = await models.seriesNumber.create({
        ...data,
        type: typeId
      }, {
        transaction: t,
        userExecutor
      });

      await t.commit();
      return newSerie;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Método para obtener y "quemar" el siguiente número
   * Úsalo en la lógica de creación de facturas/clientes
   */
  async getNextAndIncrement(typeStr, code, transaction) {
    const serie = await this.findOne(typeStr, code);
    const currentValue = serie.lastValue;
    const nextValue = this._incrementText(currentValue);

    await serie.update({ lastValue: nextValue }, { transaction });
    return nextValue;
  }

  async update(typeStr, code, changes, userExecutor) {
    const serie = await this.findOne(typeStr, code);
    return await serie.update(changes, { userExecutor });
  }

  async delete(typeStr, code, userExecutor) {
    const serie = await this.findOne(typeStr, code);
    await serie.destroy({ userExecutor });
    return { type: typeStr, code };
  }
}

module.exports = seriesNumberService;
