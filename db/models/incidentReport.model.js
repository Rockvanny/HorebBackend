const { Model, DataTypes, Sequelize } = require('sequelize');

const INCIDENT_REPORT_TABLE = 'incident_reports';

// Reportes de incidencia que un cliente crea desde la app móvil (login propio
// vía customers.service.js, ver libs/customerJwt.strategy.js). Solo lectura
// de las suyas propias -filtrado siempre por entityCode, nunca se listan
// todas- (ver routes/incidentReports.router.js).
const IncidentReportSchema = {
  id: {
    field: 'id',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4
  },

  entityCode: {
    field: 'entity_code',
    allowNull: false,
    type: DataTypes.STRING,
  },

  title: {
    field: 'title',
    allowNull: false,
    type: DataTypes.STRING,
  },

  description: {
    field: 'description',
    allowNull: false,
    type: DataTypes.TEXT,
  },

  // Sin ENUM de Postgres a propósito (como status en salesInvoice/
  // salesPostInvoice): un string simple es más fácil de ampliar más adelante
  // sin migración de tipo. Valores esperados: ABIERTO, EN_PROCESO, CERRADO.
  status: {
    field: 'status',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'ABIERTO'
  },

  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE
  },

  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE
  }
};

class IncidentReport extends Model {
  static associate(models) {
    this.belongsTo(models.Customer, {
      as: 'customer',
      foreignKey: 'entityCode',
      targetKey: 'code'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: INCIDENT_REPORT_TABLE,
      modelName: 'IncidentReport',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { IncidentReport, IncidentReportSchema, INCIDENT_REPORT_TABLE };
