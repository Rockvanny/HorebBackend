'use strict';
const { DataTypes, literal } = require('sequelize');
const { NOTIFICATIONS_TABLE } = require('../models/notification.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(NOTIFICATIONS_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      recipientUser: {
        field: 'recipient_user',
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        field: 'type',
        type: DataTypes.ENUM('MONTH_END_REMINDER', 'NEW_EMAIL'),
        allowNull: false,
      },
      title: { field: 'title', type: DataTypes.STRING, allowNull: false },
      message: { field: 'message', type: DataTypes.TEXT, allowNull: false },
      link: { field: 'link', type: DataTypes.STRING, allowNull: true },
      dedupeKey: { field: 'dedupe_key', type: DataTypes.STRING, allowNull: false },
      isRead: {
        field: 'is_read',
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    await queryInterface.addIndex(NOTIFICATIONS_TABLE, ['recipient_user', 'is_read']);
    await queryInterface.addConstraint(NOTIFICATIONS_TABLE, {
      fields: ['recipient_user', 'type', 'dedupe_key'],
      type: 'unique',
      name: 'notifications_recipient_type_dedupe_unique'
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(NOTIFICATIONS_TABLE);
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_type";');
  }
};
