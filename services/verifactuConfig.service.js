const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const cryptoHelper = require('../libs/crypto');

class VerifactuConfigService {
  constructor() { }

  /**
   * Vista segura para el frontend: el apiSecret nunca sale en claro.
   */
  #toSafeJSON(config) {
    const data = config.toJSON ? config.toJSON() : { ...config };
    const decrypted = cryptoHelper.decrypt(data.apiSecret);
    data.apiSecret = cryptoHelper.mask(decrypted);
    data.hasApiSecret = !!decrypted;
    return data;
  }

  async find(query = {}) {
    const options = { where: {} };
    const { limit, offset } = query;
    if (limit && offset) {
      options.limit = parseInt(limit, 10);
      options.offset = parseInt(offset, 10);
    }

    const rows = await models.VerifactuConfig.findAll(options);
    return rows.map(r => this.#toSafeJSON(r));
  }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['id', 'ASC']],
      where: {},
    };

    if (searchTerm) {
      options.where[Op.or] = [
        { providerName: { [Op.iLike]: `%${searchTerm.trim()}%` } },
      ];
    }

    try {
      const { count, rows } = await models.VerifactuConfig.findAndCountAll(options);
      return {
        records: rows.map(r => this.#toSafeJSON(r)),
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar la configuración de Veri*factu');
    }
  }

  async findOne(id) {
    const config = await models.VerifactuConfig.findByPk(id);
    if (!config) throw boom.notFound('Configuración de Veri*factu no encontrada');
    return this.#toSafeJSON(config);
  }

  async create(data, userExecutor) {
    const payload = this.#preparePayload(data);
    const newConfig = await models.VerifactuConfig.create(payload, { userExecutor });
    return this.#toSafeJSON(newConfig);
  }

  async update(id, changes, userExecutor) {
    const config = await models.VerifactuConfig.findByPk(id);
    if (!config) throw boom.notFound('Configuración de Veri*factu no encontrada');

    const payload = this.#preparePayload(changes);
    const updated = await config.update(payload, { userExecutor });
    return this.#toSafeJSON(updated);
  }

  async delete(id) {
    const config = await models.VerifactuConfig.findByPk(id);
    if (!config) throw boom.notFound('Configuración de Veri*factu no encontrada');
    await config.destroy();
    return { id };
  }

  /**
   * Cifra el apiSecret entrante (si viene uno nuevo) y limpia los campos de
   * proveedor cuando useProvider vuelve a false, para no dejar credenciales
   * de un proveedor desactivado colgando en la fila.
   */
  #preparePayload(data) {
    const { apiSecret, ...rest } = data;
    const payload = { ...rest };

    if (apiSecret) {
      payload.apiSecret = cryptoHelper.encrypt(apiSecret);
    }

    if (payload.useProvider === false) {
      payload.providerName = null;
      payload.apiBaseUrl = null;
      payload.apiKey = null;
      payload.apiSecret = null;
    }

    return payload;
  }

  /**
   * Uso interno del backend (todavía sin consumidor: la llamada real al
   * proveedor externo no está implementada). Es el único punto que descifra
   * el apiSecret — nunca debe exponerse a través de un router. Toma la
   * primera fila existente (en la práctica solo debería haber una).
   */
  async getActiveConfig() {
    const config = await models.VerifactuConfig.findOne({ order: [['id', 'ASC']] });
    if (!config) return null;

    const data = config.toJSON();
    data.apiSecret = cryptoHelper.decrypt(data.apiSecret);
    return data;
  }
}

module.exports = VerifactuConfigService;
