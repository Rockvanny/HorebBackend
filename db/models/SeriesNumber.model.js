const { Model, DataTypes, Sequelize } = require('sequelize');

const SERIESNUMBER_TABLE = 'series_numbers';

const seriesNumberSchema = {
  type: {
    field: 'type',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },

  startSerie: {
    field: 'start_series',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },

  description: {
    field: 'description',
    type: DataTypes.STRING,
    allowNull: false,
  },

  lastSerie: {
    field: 'last_series',
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
  }
};

class seriesNumber extends Model {

  static associate(models) { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SERIESNUMBER_TABLE,
      modelName: 'seriesNumber',
      timestamps: true,
      underscored: true
    };
  }
}

module.exports = { seriesNumber, seriesNumberSchema, SERIESNUMBER_TABLE };
