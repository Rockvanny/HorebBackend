'use strict';
const { DataTypes } = require('sequelize');
const { CUSTOMER_TABLE } = require('../models/customer.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn(CUSTOMER_TABLE, 'app_access_enabled', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      // Alta explícita por parte del personal interno, ver customer.model.js.
      defaultValue: false,
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn(CUSTOMER_TABLE, 'app_access_enabled');
  }
};
