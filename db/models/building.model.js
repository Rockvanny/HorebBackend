const { Model, DataTypes, Sequelize } = require('sequelize');

const BUILDING_TABLE = 'buildings';

// Edificio con contrato de mantenimiento activo (ej. comunidad de vecinos).
// El contrato vive DENTRO de esta misma tabla (no hay entidad Contract
// separada, decidido con el usuario 2026-09-19: sin datos económicos propios
// -importe, facturación periódica-, solo fechas/estado/alcance informativos).
// UUID en vez del esquema de código correlativo (generateNextCode) que usan
// Customer/Vendor: no es un documento fiscal secuencial, mismo criterio que
// Task/IncidentReport, y evita el bug ya conocido de "no existe serie activa"
// si un día no hay serie configurada para este tipo.
const BUILDING_CONTRACT_STATUSES = ['ACTIVO', 'FINALIZADO', 'SUSPENDIDO'];

const BuildingSchema = {
  id: {
    field: 'id',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4
  },

  name: {
    field: 'name',
    allowNull: false,
    type: DataTypes.STRING,
  },

  address: {
    field: 'address',
    allowNull: false,
    type: DataTypes.STRING,
  },

  postCode: {
    field: 'post_code',
    allowNull: true,
    type: DataTypes.STRING,
  },

  city: {
    field: 'city',
    allowNull: true,
    type: DataTypes.STRING,
  },

  province: {
    field: 'province',
    allowNull: true,
    type: DataTypes.STRING,
  },

  // Referencia externa opcional (ej. si el contrato en papel/otro sistema
  // tiene su propio número), no un código generado aquí.
  contractCode: {
    field: 'contract_code',
    allowNull: true,
    type: DataTypes.STRING,
  },

  contractStartDate: {
    field: 'contract_start_date',
    allowNull: true,
    type: DataTypes.DATEONLY,
  },

  contractEndDate: {
    field: 'contract_end_date',
    allowNull: true,
    type: DataTypes.DATEONLY,
  },

  // Sin ENUM de Postgres a propósito (como status en Task/IncidentReport):
  // más fácil de ampliar sin migración de tipo.
  contractStatus: {
    field: 'contract_status',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'ACTIVO'
  },

  // Qué cubre el contrato (jardinería, ascensores, fontanería general...),
  // texto libre a propósito: el alcance varía mucho de un edificio a otro.
  maintenanceScope: {
    field: 'maintenance_scope',
    allowNull: true,
    type: DataTypes.TEXT,
  },

  // Contacto principal del edificio (administrador de fincas o presidente de
  // comunidad) -NO es un Customer: no factura, no tiene login propio, es
  // solo un dato de contacto operativo.
  administratorName: {
    field: 'administrator_name',
    allowNull: true,
    type: DataTypes.STRING,
  },

  administratorPhone: {
    field: 'administrator_phone',
    allowNull: true,
    type: DataTypes.STRING,
  },

  notes: {
    field: 'notes',
    allowNull: true,
    type: DataTypes.TEXT,
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

class Building extends Model {
  static associate(models) {
    this.hasMany(models.CustomerBuilding, {
      as: 'customerLinks',
      foreignKey: 'buildingId',
      sourceKey: 'id'
    });

    this.hasMany(models.IncidentReport, {
      as: 'incidentReports',
      foreignKey: 'buildingId',
      sourceKey: 'id'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: BUILDING_TABLE,
      modelName: 'Building',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { Building, BuildingSchema, BUILDING_TABLE, BUILDING_CONTRACT_STATUSES };
