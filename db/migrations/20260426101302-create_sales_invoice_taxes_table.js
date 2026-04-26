'use strict';

// Importamos el nombre de la tabla desde el modelo que definimos antes
const { SALESINVOICE_TAX_TABLE } = require('../models/salesInvoiceTax.model');
const { SALESINVOICE_TABLE } = require('../models/salesInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESINVOICE_TAX_TABLE, {
      id: {
        field: 'id',
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
          model: SALESINVOICE_TABLE,
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    // Índices para optimizar las búsquedas de impuestos por factura
    await queryInterface.addIndex(SALESINVOICE_TAX_TABLE, ['invoice_code']);
    // Índice compuesto para evitar duplicados del mismo tipo de IVA en la misma factura
    await queryInterface.addIndex(SALESINVOICE_TAX_TABLE, ['invoice_code', 'tax_percentage'], {
      unique: true,
      name: 'unique_tax_per_invoice'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(SALESINVOICE_TAX_TABLE);
  }
};
