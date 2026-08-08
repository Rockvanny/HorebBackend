'use strict';
const { DataTypes, literal } = require('sequelize');
const { PURCHPOSTINVOICELINE_TABLE } = require('../models/purchPostInvoiceLine.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(PURCHPOSTINVOICELINE_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      codeDocument: {
        field: 'code_document',
        allowNull: false,
        type: DataTypes.STRING,
        references: {
          model: 'purch_post_invoices',
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lineNo: {
        field: 'line_no',
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      codeItem: {
        field: 'item_code',
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        field: 'description',
        type: DataTypes.TEXT,
        allowNull: true,
      },
      quantity: {
        field: 'quantity',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0
      },
      unitMeasure: {
        field: 'unit_measure',
        type: DataTypes.ENUM('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK'),
        defaultValue: 'UNIDAD'
      },
      quantityUnitMeasure: {
        field: 'quantity_unit_measure',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 1
      },
      unitPrice: {
        field: 'unit_price',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0
      },
      taxType: {
        field: 'tax_type',
        type: DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
        allowNull: false,
        defaultValue: 'IVA'
      },
      vat: {
        field: 'vat',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 21
      },
      amountLine: {
        field: 'amount_line',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0
      },
      userName: {
        field: 'user_name',
        type: DataTypes.STRING,
        allowNull: true,
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

    await queryInterface.addIndex(PURCHPOSTINVOICELINE_TABLE, ['code_document', 'line_no'], {
      unique: true,
      name: 'purch_post_invoice_lines_unique_idx'
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(PURCHPOSTINVOICELINE_TABLE);
    // Limpieza de ENUMS para las líneas
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_post_invoice_lines_unit_measure";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_post_invoice_lines_tax_type";');
  }
};
