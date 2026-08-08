'use strict';
const { DataTypes, literal } = require('sequelize');
const { VERIFACTU_LOG_TABLE } = require('../models/verifactuLogs.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(VERIFACTU_LOG_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      invoiceCode: {
        field: 'invoice_code',
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
        references: {
          model: 'sales_post_invoices',
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      fingerprint: {
        field: 'fingerprint',
        allowNull: false,
        type: DataTypes.TEXT,
      },
      prevFingerprint: {
        field: 'prev_fingerprint',
        allowNull: true,
        type: DataTypes.TEXT,
      },
      qrData: {
        field: 'qr_data',
        allowNull: true,
        type: DataTypes.TEXT,
      },
      payload: {
        field: 'payload',
        allowNull: false,
        type: DataTypes.JSONB,
      },
      externalReference: {
        field: 'external_reference',
        type: DataTypes.STRING,
      },
      isTest: {
        field: 'is_test',
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      exportedAt: {
        field: 'exported_at',
        allowNull: true,
        type: DataTypes.DATE,
      },
      createdAt: {
        field: 'created_at',
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice para velocidad en el encadenamiento de huellas
    await queryInterface.addIndex(VERIFACTU_LOG_TABLE, ['fingerprint']);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(VERIFACTU_LOG_TABLE);
  }
};
