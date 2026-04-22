const { Model, DataTypes, Sequelize } = require('sequelize');

const SERIESNUMBER_TABLE = 'series_numbers';

const seriesNumberSchema = {
  // Ej: 'CUSTOMER', 'INVOICE'
  type: {
    field: 'type',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  // Ej: '2026', 'GEN'
  startSerie: {
    field: 'start_series',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  postingSerie: {
    field: 'posting_serie',
    type: DataTypes.STRING,
    allowNull: true, // Null para las que ya son definitivas
  },
  description: {
    field: 'description',
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Prefijo para el formato alfanumérico (ej: 'CL')
  prefix: {
    field: 'prefix',
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Contador numérico
  lastNumber: {
    field: 'last_number',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  // Cantidad de ceros (ej: 4 para '0001')
  digits: {
    field: 'digits',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4
  },
  // --- CONTROL DE VIGENCIA ---
  fromDate: {
    field: 'from_date',
    allowNull: false,
    type: DataTypes.DATEONLY // Solo fecha, sin hora
  },
  toDate: {
    field: 'to_date',
    allowNull: false,
    type: DataTypes.DATEONLY
  },
  username: {
    field: 'user_name',
    type: DataTypes.STRING,
  },
  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
};

class seriesNumber extends Model {
  static associate(models) {}
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
