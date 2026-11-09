const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { models } = sequelize;
const { Op } = require('sequelize');
const { SERIES_TYPES } = require('../db/models/SeriesNumber.model');
const { incrementAlphanumeric } = require('../libs/sequence.handler');
const logger = require('../libs/logger');

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
      // Solo numeraciones DEFINITIVAS (sin serie vinculada): antes salían
      // también las provisionales, y se podía vincular una provisional a otra.
      return await models.seriesNumber.findAll({
        where: {
          type: typeId,
          [Op.or]: [{ postingSerie: null }, { postingSerie: '' }]
        },
        attributes: ['code', 'description'],
        order: [['code', 'ASC']]
      });
    } catch (e) {
      logger.warn(`SeriesNumberService.getPostSeries: ${e.message}`);
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

    // 1. Definimos las condiciones base para cualquier tipo de serie
    const whereCondition = {
      type: typeId,
      fromDate: { [Op.lte]: today },
      toDate: { [Op.gte]: today }
    };

    // Comparamos por el id numérico ya resuelto (typeId), no por el string
    // recibido: el schema de validación (querySeriesNumberSchema) usa
    // Joi.alternatives().try(Joi.string().valid(...), Joi.number(), ...), y
    // para un tipo numérico como '4'/'5'/'6' Joi.number() coacciona el valor
    // a un Number antes de que llegue aquí -"4".toLowerCase() no existe en
    // un Number, así que cualquier llamada con el id numérico (budget,
    // salesinvoice, purchinvoice desde el Frontend) reventaba con 500-.
    // 'customer'/'vendor'/'product' no se veían afectados porque esos sí
    // llegan siempre como el string exacto de la primera alternativa.
    const isInvoiceType = [SERIES_TYPES.salesinvoice.id, SERIES_TYPES.purchinvoice.id].includes(typeId);

    // 2. Aplicamos el filtro de "Solo Borradores" únicamente para Facturas
    // Si es salesinvoice o purchinvoice, ocultamos las que NO tienen postingSerie
    if (isInvoiceType) {
      whereCondition.postingSerie = {
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.ne]: '' }
        ]
      };
    }

    return await models.seriesNumber.findAll({
      where: whereCondition,
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

  /**
   * Crea una serie. Con `newPostingSerie` (solo documentos de venta/compra)
   * crea además su numeración DEFINITIVA y deja la nueva serie como
   * PROVISIONAL vinculada a ella, todo en una transacción: o se crean las
   * dos o ninguna. Así el usuario ya no tiene que crear antes la definitiva
   * (ver fields-series-handlel.js).
   */
  async create(data, userExecutor) {
    const typeId = this.#getTypeId(data.type);
    const { newPostingSerie, ...serieData } = data;

    if (!newPostingSerie) {
      return await models.seriesNumber.create({ ...serieData, type: typeId }, { userExecutor });
    }

    const voucherTypes = [SERIES_TYPES.salesinvoice.id, SERIES_TYPES.purchinvoice.id];
    if (!voucherTypes.includes(typeId)) {
      throw boom.badRequest('La numeración definitiva solo se usa en documentos de venta y de compra.');
    }
    if (newPostingSerie === serieData.code) {
      throw boom.badRequest('La numeración definitiva necesita un código distinto del de la provisional.');
    }
    const existing = await models.seriesNumber.findOne({ where: { type: typeId, code: newPostingSerie } });
    if (existing) {
      throw boom.conflict(`Ya existe la serie ${newPostingSerie}: marca "Usar una numeración definitiva que ya existe" y elígela.`);
    }

    return await sequelize.transaction(async (transaction) => {
      await models.seriesNumber.create({
        type: typeId,
        code: newPostingSerie,
        description: `${serieData.description} (definitiva)`.slice(0, 100),
        fromDate: serieData.fromDate,
        toDate: serieData.toDate,
        postingSerie: null,
        username: serieData.username
      }, { transaction, userExecutor });

      return await models.seriesNumber.create(
        { ...serieData, type: typeId, postingSerie: newPostingSerie },
        { transaction, userExecutor }
      );
    });
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
