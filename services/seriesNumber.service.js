const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const { Op } = require('sequelize');
const { SERIES_TYPES } = require('../db/models/SeriesNumber.model');
const { incrementAlphanumeric } = require('../libs/sequence.handler');

class seriesNumberService {
  constructor() { }

  /**
   * Método privado para normalizar el ID del tipo de serie.
   * Acepta tanto el ID numérico como el string (key).
   */
  #getTypeId(typeValue) {
    if (typeValue !== undefined && typeValue !== null && !isNaN(typeValue) && typeValue !== '') {
      return parseInt(typeValue, 10);
    }

    const typeInfo = SERIES_TYPES[typeValue];
    if (!typeInfo) {
      throw boom.badRequest(`Tipo de serie '${typeValue}' no válido`);
    }

    return typeInfo.id;
  }

  async getAvailableTypes() {
    return Object.keys(SERIES_TYPES).map(key => ({
      key,
      id: SERIES_TYPES[key].id,
      label: SERIES_TYPES[key].label || key
    }));
  }

  /**
   * Obtiene las series candidatas para ser vinculadas (postingSerie).
   */
  async getPostSeries(sourceTypeStr) {
    let targetType;

    const sourceKey = sourceTypeStr.toLowerCase();

    // AQUÍ ESTABA EL ERROR:
    // El servicio intentaba buscar 'salespostinvoice' en SERIES_TYPES y no lo encontraba.
    // Debes poner aquí la KEY exacta que aparece en tu SERIES_TYPES para facturas registradas.

    if (['salesinvoice', 'salesbudget'].includes(sourceKey)) {
      targetType = 'salesinvoice'; // O el nombre exacto que tengas en SERIES_TYPES
    } else if (['purchinvoice', 'purchbudget'].includes(sourceKey)) {
      targetType = 'purchinvoice'; // O el nombre exacto que tengas en SERIES_TYPES
    } else {
      return [];
    }

    // Si no quieres filtrar por tipo y solo quieres traer series,
    // podrías saltarte el #getTypeId y buscar por la key directamente si tu modelo lo permite.
    try {
        const typeId = this.#getTypeId(targetType);
        return await models.seriesNumber.findAll({
          where: { type: typeId },
          attributes: ['code', 'description'],
          order: [['code', 'ASC']]
        });
    } catch (e) {
        console.error("Error en getPostSeries:", e.message);
        return []; // Retorna vacío si el tipo no existe para evitar el crash
    }
  }

  async findOne(typeStr, code) {
    const typeId = this.#getTypeId(typeStr);
    const serieNumber = await models.seriesNumber.findOne({ where: { type: typeId, code } });
    if (!serieNumber) throw boom.notFound('Serie no encontrada');
    return serieNumber;
  }

  async findByType(typeStr) {
    const typeId = this.#getTypeId(typeStr);
    const today = new Date().toISOString().split('T')[0];

    return await models.seriesNumber.findAll({
      where: {
        type: typeId,
        fromDate: { [Op.lte]: today },
        toDate: { [Op.gte]: today }
      },
      attributes: ['type', 'code', 'lastValue', 'postingSerie', 'description', 'fromDate', 'toDate'],
      order: [['code', 'ASC']]
    });
  }

  async findPaginated({ limit, offset, type, searchTerm }) {
    const options = {
      limit: parseInt(limit, 10) || 10,
      offset: parseInt(offset, 10) || 0,
      where: {},
      order: [['createdAt', 'DESC']]
    };

    if (type) options.where.type = this.#getTypeId(type);

    if (searchTerm) {
      const term = searchTerm.trim();
      options.where[Op.or] = [
        { description: { [Op.iLike]: `%${term}%` } },
        { code: { [Op.iLike]: `%${term}%` } }
      ];
    }

    const { count, rows } = await models.seriesNumber.findAndCountAll(options);

    return {
      records: rows,
      total: count,
      hasMore: (options.offset + rows.length) < count
    };
  }

  async create(data, userExecutor) {
    const typeId = this.#getTypeId(data.type);
    return await models.seriesNumber.create({ ...data, type: typeId }, { userExecutor });
  }

  async getNextAndIncrement(typeStr, code, transaction) {
    const serie = await this.findOne(typeStr, code);
    const nextValue = incrementAlphanumeric(serie.lastValue || serie.code);
    await serie.update({ lastValue: nextValue }, { transaction });
    return nextValue;
  }

  async update(typeStr, code, changes, userExecutor) {
    const serie = await this.findOne(typeStr, code);

    if (serie.lastValue) {
      const blockedFields = ['fromDate', 'toDate', 'type', 'code', 'postingSerie'];
      const attemptingToChange = Object.keys(changes).filter(key =>
        blockedFields.includes(key) && changes[key] !== serie[key]
      );

      if (attemptingToChange.length > 0) {
        throw boom.badRequest(`No se pueden editar [${attemptingToChange.join(', ')}] en una serie en uso.`);
      }
    }
    return await serie.update(changes, { userExecutor });
  }

  async delete(typeStr, code, userExecutor) {
    const serie = await this.findOne(typeStr, code);
    if (serie.lastValue) {
      throw boom.badRequest("No se puede eliminar una serie con historial.");
    }
    await serie.destroy({ userExecutor });
    return { type: typeStr, code };
  }
}

module.exports = seriesNumberService;
