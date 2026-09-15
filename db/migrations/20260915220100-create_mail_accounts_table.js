'use strict';
const { DataTypes, literal } = require('sequelize');
const { MAIL_ACCOUNTS_TABLE } = require('../models/mailAccount.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(MAIL_ACCOUNTS_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      userCode: {
        field: 'user_code',
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: { field: 'email', type: DataTypes.STRING, allowNull: false },
      imapHost: { field: 'imap_host', type: DataTypes.STRING, allowNull: false },
      imapPort: {
        field: 'imap_port',
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 993,
      },
      imapSecure: {
        field: 'imap_secure',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      username: { field: 'username', type: DataTypes.STRING, allowNull: false },
      passwordEncrypted: { field: 'password_encrypted', type: DataTypes.TEXT, allowNull: false },
      lastSeenUid: { field: 'last_seen_uid', type: DataTypes.INTEGER, allowNull: true },
      lastCheckedAt: { field: 'last_checked_at', type: DataTypes.DATE, allowNull: true },
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
    await queryInterface.dropTable(MAIL_ACCOUNTS_TABLE);
  }
};
