const { Model, DataTypes } = require('sequelize');

const INSTALLATION_SETTINGS_TABLE = 'installation_settings';

/**
 * Ajustes de la instalación (una sola fila, id 1): país, moneda y formato
 * regional. Los fija el asistente de primera instalación y no cambian
 * después. Ver libs/installationSettings.js.
 */
const InstallationSettingsSchema = {
  id: { allowNull: false, primaryKey: true, type: DataTypes.INTEGER, defaultValue: 1 },
  country: { allowNull: false, type: DataTypes.STRING(5), defaultValue: 'ES' },
  currency: { allowNull: false, type: DataTypes.STRING(3), defaultValue: 'EUR' },
  locale: { allowNull: false, type: DataTypes.STRING(10), defaultValue: 'es-ES' },
  createdAt: { field: 'created_at', allowNull: false, type: DataTypes.DATE },
  updatedAt: { field: 'updated_at', allowNull: false, type: DataTypes.DATE }
};

class InstallationSettings extends Model {
  static associate() { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: INSTALLATION_SETTINGS_TABLE,
      modelName: 'InstallationSettings',
      timestamps: true,
      underscored: true
    };
  }
}

module.exports = { InstallationSettings, InstallationSettingsSchema, INSTALLATION_SETTINGS_TABLE };
