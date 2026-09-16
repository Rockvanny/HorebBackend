'use strict';
const { DataTypes } = require('sequelize');
const { MAIL_ACCOUNTS_TABLE } = require('../models/mailAccount.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn(MAIL_ACCOUNTS_TABLE, 'smtp_host', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn(MAIL_ACCOUNTS_TABLE, 'smtp_port', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 465,
    });
    await queryInterface.addColumn(MAIL_ACCOUNTS_TABLE, 'smtp_secure', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn(MAIL_ACCOUNTS_TABLE, 'smtp_host');
    await queryInterface.removeColumn(MAIL_ACCOUNTS_TABLE, 'smtp_port');
    await queryInterface.removeColumn(MAIL_ACCOUNTS_TABLE, 'smtp_secure');
  }
};
