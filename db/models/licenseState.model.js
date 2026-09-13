const { Model, DataTypes } = require('sequelize');

const LICENSE_STATE_TABLE = 'license_state';

// Tabla de una sola fila (id fijo = 1): guarda el estado comercial de ESTA
// instalación (inicio de la prueba gratuita y, si la hay, la licencia activa).
const LicenseStateSchema = {
  id: {
    field: 'id',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.INTEGER,
    defaultValue: 1
  },

  trialStartedAt: {
    field: 'trial_started_at',
    allowNull: false,
    type: DataTypes.DATE,
  },

  licenseToken: {
    field: 'license_token',
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

class LicenseState extends Model {
  static associate(models) { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: LICENSE_STATE_TABLE,
      modelName: 'LicenseState',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { LicenseState, LicenseStateSchema, LICENSE_STATE_TABLE };
