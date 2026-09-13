'use strict';
const { DataTypes, Sequelize, literal } = require('sequelize');
const { LOGIN_OTP_TABLE } = require('../models/loginOtp.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(LOGIN_OTP_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      userCode: {
        field: 'user_code',
        allowNull: false,
        type: DataTypes.STRING,
        references: {
          model: 'users',
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      purpose: {
        field: 'purpose',
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'LOGIN_2FA'
      },
      codeHash: {
        field: 'code_hash',
        allowNull: false,
        type: DataTypes.STRING,
      },
      attempts: {
        field: 'attempts',
        allowNull: false,
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      maxAttempts: {
        field: 'max_attempts',
        allowNull: false,
        type: DataTypes.INTEGER,
        defaultValue: 5
      },
      resendCount: {
        field: 'resend_count',
        allowNull: false,
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      maxResends: {
        field: 'max_resends',
        allowNull: false,
        type: DataTypes.INTEGER,
        defaultValue: 3
      },
      expiresAt: {
        field: 'expires_at',
        allowNull: false,
        type: DataTypes.DATE,
      },
      consumedAt: {
        field: 'consumed_at',
        allowNull: true,
        type: DataTypes.DATE,
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

    // Búsqueda rápida de retos pendientes por usuario
    await queryInterface.addIndex(LOGIN_OTP_TABLE, ['user_code']);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(LOGIN_OTP_TABLE);
  }
};
