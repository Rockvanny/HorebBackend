const { Model, DataTypes } = require('sequelize');

const MODULE_CONFIG_TABLE = 'module_config';

const ModuleConfigSchema = {
  // Identificador de negocio elegido por el admin al crear el módulo
  // (ej. 'VERIFACTU'), NO autonumerado. Lo usa el propio código del backend
  // para consultar el flag (ver services/moduleConfig.service.js#isEnabled),
  // así que no debe cambiar una vez creado.
  key: {
    field: 'key',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },

  name: {
    field: 'name',
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    field: 'description',
    type: DataTypes.STRING,
    allowNull: true,
  },

  enabled: {
    field: 'enabled',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },

  username: {
    field: 'user_name',
    type: DataTypes.STRING,
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

class ModuleConfig extends Model {
  static associate(models) {
    // Sin relaciones: es una tabla de configuración plana.
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: MODULE_CONFIG_TABLE,
      modelName: 'ModuleConfig',
      timestamps: true,
      underscored: true
    };
  }
}

module.exports = { ModuleConfig, ModuleConfigSchema, MODULE_CONFIG_TABLE };
