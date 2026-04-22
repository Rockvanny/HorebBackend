'use strict';
const { SERIESNUMBER_TABLE } = require('../models/SeriesNumber.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SERIESNUMBER_TABLE, {
      // Ahora es INTEGER para manejar los IDs internos (1: customer, 5: salesinvoice, etc.)
      type: {
        field: 'type',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER
      },
      // Identificador de la serie (PK compuesta con type)
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      // Valor alfanumérico actual (ej: 'FV0001')
      lastValue: {
        field: 'last_value',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: ''
      },
      // Referencia al 'code' de la serie de registro
      postingSerie: {
        field: 'posting_serie',
        allowNull: true,
        type: Sequelize.DataTypes.STRING
      },
      description: {
        field: 'description',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      fromDate: {
        field: 'from_date',
        allowNull: false,
        type: Sequelize.DataTypes.DATEONLY
      },
      toDate: {
        field: 'to_date',
        allowNull: false,
        type: Sequelize.DataTypes.DATEONLY
      },
      username: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
      },
      createdAt: {
        field: 'created_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        field: 'updated_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(SERIESNUMBER_TABLE);
  }
};
