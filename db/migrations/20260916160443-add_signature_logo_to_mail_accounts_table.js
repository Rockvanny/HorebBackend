'use strict';
const { DataTypes } = require('sequelize');
const { MAIL_ACCOUNTS_TABLE } = require('../models/mailAccount.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn(MAIL_ACCOUNTS_TABLE, 'signature_logo', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn(MAIL_ACCOUNTS_TABLE, 'signature_logo');
  }
};
