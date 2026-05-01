'use strict';

const { VERIFACTU_LOG_TABLE } = require('../models/verifactuLogs.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(VERIFACTU_LOG_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER
      },
      invoiceCode: {
        field: 'invoice_code',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
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
        type: Sequelize.DataTypes.TEXT,
      },
      prevFingerprint: {
        field: 'prev_fingerprint',
        allowNull: true,
        type: Sequelize.DataTypes.TEXT,
      },
      qrData: {
        field: 'qr_data',
        allowNull: true,
        type: Sequelize.DataTypes.TEXT,
      },
      payload: {
        field: 'payload',
        allowNull: false,
        type: Sequelize.DataTypes.JSONB,
      },
      externalReference: {
        field: 'external_reference',
        type: Sequelize.DataTypes.STRING,
      },
      isTest: {
        field: 'is_test',
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false
      },
      // --- NUEVO CAMPO PARA EXPORTACIÓN ---
      exportedAt: {
        field: 'exported_at',
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
      },
      // ------------------------------------
      createdAt: {
        field: 'created_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Índice para velocidad en el encadenamiento de huellas
    await queryInterface.addIndex(VERIFACTU_LOG_TABLE, ['fingerprint']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(VERIFACTU_LOG_TABLE);
  }
};
