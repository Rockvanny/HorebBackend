const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class BuildingsService {

  async create(data) {
    return models.Building.create(data);
  }

  async find({ searchTerm, contractStatus } = {}) {
    const options = { where: {}, order: [['name', 'ASC']] };

    if (contractStatus) {
      options.where.contractStatus = contractStatus;
    }
    if (searchTerm) {
      const term = searchTerm.trim();
      const pattern = `%${term}%`;
      options.where[Op.or] = [
        { name: { [Op.iLike]: pattern } },
        { address: { [Op.iLike]: pattern } },
        { city: { [Op.iLike]: pattern } }
      ];
    }

    return models.Building.findAll(options);
  }

  /** Igual que CustomerService#findPaginated, para el listPage del Frontend. */
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['name', 'ASC']],
      where: {}
    };

    if (searchTerm) {
      const term = searchTerm.trim();
      const pattern = term.includes('%') ? term : `%${term}%`;
      options.where[Op.or] = [
        { name: { [Op.iLike]: pattern } },
        { address: { [Op.iLike]: pattern } },
        { city: { [Op.iLike]: pattern } }
      ];
    }

    const { count, rows } = await models.Building.findAndCountAll(options);

    return {
      records: rows,
      hasMore: (parsedOffset + rows.length) < count,
      total: count
    };
  }

  async findOne(id) {
    const building = await models.Building.findByPk(id);
    if (!building) throw boom.notFound('Edificio no encontrado');
    return building;
  }

  async update(id, changes) {
    const building = await this.findOne(id);
    return building.update(changes);
  }

  /**
   * Antes de borrar, comprobamos que no queden clientes vinculados -si no,
   * se perdería silenciosamente el histórico de quién vivía dónde-. Hay que
   * dar de baja (isActive=false) o reasignar esos vínculos primero.
   */
  async delete(id) {
    const building = await this.findOne(id);

    const linkedCustomers = await models.CustomerBuilding.count({ where: { buildingId: id } });
    if (linkedCustomers > 0) {
      throw boom.conflict('No se puede eliminar: hay clientes vinculados a este edificio.');
    }

    await building.destroy();
    return { id };
  }
}

module.exports = BuildingsService;
