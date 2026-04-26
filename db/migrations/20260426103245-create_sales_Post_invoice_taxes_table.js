'use strict';

const { SALESPOSTINVOICE_TAX_TABLE } = require('../models/salesPostInvoiceTax.model');
const { SALESPOSTINVOICE_TABLE } = require('../models/salesPostInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESPOSTINVOICE_TAX_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER,
      },
      invoiceCode: {
        field: 'invoice_code',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
        references: {
          model: SALESPOSTINVOICE_TABLE,
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT' // Seguridad fiscal: bloquea el borrado si hay impuestos
      },
      taxType: {
        field: 'tax_type',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'IVA'
      },
      taxPercentage: {
        field: 'tax_percentage',
        type: Sequelize.DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      taxableAmount: {
        field: 'taxable_amount',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      taxAmount: {
        field: 'tax_amount',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
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

    // Índice para optimizar consultas por código de factura
    await queryInterface.addIndex(SALESPOSTINVOICE_TAX_TABLE, ['invoice_code']);

    // Índice único para asegurar integridad en el desglose
    await queryInterface.addIndex(SALESPOSTINVOICE_TAX_TABLE, ['invoice_code', 'tax_percentage'], {
      unique: true,
      name: 'unique_tax_per_post_invoice'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(SALESPOSTINVOICE_TAX_TABLE);
  }
};
