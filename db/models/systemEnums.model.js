const { Model, DataTypes } = require('sequelize');

const SYSTEM_ENUM_TABLE = 'system_enums';

const SystemEnumSchema = {
  id: {
    field: 'id',
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },

  model: {
    field: 'model',
    type: DataTypes.STRING,
    allowNull: false,
  },

  field: {
    field: 'field',
    type: DataTypes.STRING,
    allowNull: false,
  },

  code: {
    field: 'code',
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    field: 'description',
    type: DataTypes.STRING,
    allowNull: false,
  },

  sortOrder: {
    field: 'sort_order',
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  isActive: {
    field: 'is_active',
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  },

  deleteAt: {
    field: 'delete_at',
    allowNull: true,
    type: DataTypes.DATE
  }
}

class SystemEnum extends Model {
  static associate(models) {
    // No requiere asociaciones iniciales
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SYSTEM_ENUM_TABLE,
      modelName: 'SystemEnum',
      timestamps: true,
      underscored: true,
      paranoid: true,
      deletedAt: 'deleteAt'
    }
  }
}

module.exports = { SystemEnum, SystemEnumSchema, SYSTEM_ENUM_TABLE };
