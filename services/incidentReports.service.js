const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class IncidentReportService {

  /**
   * Crea un reporte para el cliente autenticado (req.user.code, ver el
   * router). Si viene buildingId, se comprueba que sea de verdad UN edificio
   * del propio cliente -si no, cualquiera podría etiquetar su incidencia con
   * el edificio de otro solo adivinando el UUID-.
   */
  async create(entityCode, data) {
    if (data.buildingId) {
      const link = await models.CustomerBuilding.findOne({
        where: { customerCode: entityCode, buildingId: data.buildingId, isActive: true }
      });
      if (!link) {
        throw boom.forbidden('Ese edificio no está asociado a tu cuenta.');
      }
    }

    return models.IncidentReport.create({ entityCode, ...data });
  }

  /** Historial del propio cliente, más recientes primero. Nunca de otros clientes. */
  async findMine(entityCode) {
    return models.IncidentReport.findAll({
      where: { entityCode },
      order: [['createdAt', 'DESC']]
    });
  }
}

module.exports = IncidentReportService;
