'use strict';
const { DataTypes, literal } = require('sequelize');
const { LICENSE_STATE_TABLE } = require('../models/licenseState.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(LICENSE_STATE_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.INTEGER,
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
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        field: 'updated_at',
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(LICENSE_STATE_TABLE);
  }
};
