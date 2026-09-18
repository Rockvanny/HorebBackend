const { models } = require('../libs/sequelize');

class IncidentReportService {

  /** Crea un reporte para el cliente autenticado (req.user.code, ver el router). */
  async create(entityCode, data) {
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
