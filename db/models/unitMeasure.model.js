const { Model, DataTypes, Sequelize } = require('sequelize');

const UNITMEASURE_TABLE = 'unit_measures';

const UnitMeasureSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING,
  },

  description: {
    field: 'description',
    allowNull: false,
    type: DataTypes.STRING,
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
  },

  deleteAt: {
    field: 'delete_at',
    allowNull: true,
    type: DataTypes.DATE
  }
}

class UnitMeasure extends Model {
  static associate(models) {
    // define association here
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: UNITMEASURE_TABLE,
      modelName: 'UnitMeasure',
      timestamps: true,
      underscored: true,
      paranoid: true,
      deletedAt: 'deleteAt'
    }
  }
}

module.exports = { UnitMeasure, UnitMeasureSchema, UNITMEASURE_TABLE };
