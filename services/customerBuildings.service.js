const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class CustomerBuildingsService {

  async create(data) {
    // Validar que el cliente y el edificio existen de verdad -sin esto, un
    // customerCode o buildingId mal escrito crearía un vínculo huérfano que
    // solo se detectaría más tarde por un error de FK a medias-.
    const customer = await models.Customer.findByPk(data.customerCode);
    if (!customer) throw boom.notFound('Cliente no encontrado');

    const building = await models.Building.findByPk(data.buildingId);
    if (!building) throw boom.notFound('Edificio no encontrado');

    return models.CustomerBuilding.create(data);
  }

  async find({ customerCode, buildingId } = {}) {
    const where = {};
    if (customerCode) where.customerCode = customerCode;
    if (buildingId) where.buildingId = buildingId;

    return models.CustomerBuilding.findAll({
      where,
      include: [
        { model: models.Customer, as: 'customer', attributes: ['code', 'name'] },
        { model: models.Building, as: 'building', attributes: ['id', 'name', 'address', 'city'] }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async findOne(id) {
    const link = await models.CustomerBuilding.findByPk(id);
    if (!link) throw boom.notFound('Vínculo no encontrado');
    return link;
  }

  async update(id, changes) {
    const link = await this.findOne(id);
    return link.update(changes);
  }

  async delete(id) {
    const link = await this.findOne(id);
    await link.destroy();
    return { id };
  }

  /**
   * "Mis edificios" para el cliente autenticado (app móvil, customer-jwt):
   * solo los vínculos activos, simplificado para un selector al reportar una
   * incidencia -ver routes/customerBuildings.router.js#/mine-.
   */
  async findMine(customerCode) {
    const links = await models.CustomerBuilding.findAll({
      where: { customerCode, isActive: true },
      include: [{ model: models.Building, as: 'building' }],
      order: [['createdAt', 'ASC']]
    });

    return links.map((link) => ({
      linkId: link.id,
      buildingId: link.buildingId,
      name: link.building?.name,
      address: link.building?.address,
      city: link.building?.city,
      unitNumber: link.unitNumber,
      relationshipType: link.relationshipType
    }));
  }
}

module.exports = CustomerBuildingsService;
