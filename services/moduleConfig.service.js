const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const logger = require('../libs/logger');

class ModuleConfigService {
  constructor() { }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['key', 'ASC']],
      where: {}
    };

    if (searchTerm) {
      const pattern = `%${searchTerm.trim()}%`;
      options.where[Op.or] = [
        { key: { [Op.iLike]: pattern } },
        { name: { [Op.iLike]: pattern } }
      ];
    }

    try {
      const { count, rows } = await models.ModuleConfig.findAndCountAll(options);
      return { records: rows, hasMore: (parsedOffset + rows.length) < count, total: count };
    } catch (error) {
      throw boom.badImplementation('Error al consultar módulos', error);
    }
  }

  async find() {
    return models.ModuleConfig.findAll({ order: [['key', 'ASC']] });
  }

  async findOne(key) {
    const module = await models.ModuleConfig.findByPk(key);
    if (!module) throw boom.notFound(`Módulo '${key}' no encontrado`);
    return module;
  }

  async create(data, userExecutor) {
    try {
      return await models.ModuleConfig.create(data, { userExecutor });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw boom.conflict(`Ya existe un módulo con la clave '${data.key}'.`);
      }
      throw error;
    }
  }

  async update(key, changes, userExecutor) {
    const module = await this.findOne(key);
    return await module.update(changes, { userExecutor });
  }

  async delete(key) {
    const module = await this.findOne(key);
    await module.destroy();
    return { key };
  }

  /**
   * Punto de consulta único para el resto del backend: ¿está activo el
   * módulo `key`? (ej. services/salesPostInvoice.service.js antes de
   * generar el registro Veri*factu). Si el módulo no existe todavía en la
   * tabla (instalación recién migrada, o clave mal escrita en el código que
   * consulta), se degrada a "activo" en vez de romper el flujo que lo
   * invoca: un módulo de negocio ya en marcha (como Veri*factu) no debe
   * desactivarse por una fila ausente.
   */
  async isEnabled(key) {
    const module = await models.ModuleConfig.findByPk(key);
    if (!module) {
      logger.error(`ModuleConfigService#isEnabled: módulo '${key}' no encontrado, se asume activo.`);
      return true;
    }
    return !!module.enabled;
  }
}

module.exports = ModuleConfigService;
