'use strict';
const { DataTypes } = require("sequelize");

const { SERIESNUMBER_TABLE } = require('../models/SeriesNumber.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SERIESNUMBER_TABLE, {
      type: {
        field: 'type',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      startSerie: {
        field: 'start_series',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      description: {
        field: 'description',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      lastSerie: {
        field: 'last_series',
        type: Sequelize.DataTypes.STRING,
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
