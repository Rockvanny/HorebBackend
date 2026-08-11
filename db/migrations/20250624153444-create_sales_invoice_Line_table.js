'use strict';
const { DataTypes, literal } = require('sequelize');
const { SALESINVOICELINE_TABLE } = require('../models/salesInvoiceLine.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(SALESINVOICELINE_TABLE, {
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
          model: 'sales_invoices',
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lineNo: {
        field: 'line_no',
        allowNull: false,
        type: DataTypes.INTEGER,
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
        defaultValue: 0.0000
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
        defaultValue: 1.0000
      },
      width: {
        field: 'width',
        type: DataTypes.DECIMAL(12, 4),
        defaultValue: 0
      },

      height: {
        field: 'height',
        type: DataTypes.DECIMAL(12, 4),
        defaultValue: 0
      },

      unitPrice: {
        field: 'unit_price',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },

      // --- NUEVA COLUMNA DE TIPO DE IMPUESTO ---
      taxType: {
        field: 'tax_type',
        type: DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
        allowNull: false,
        defaultValue: 'IVA'
      },
      // -----------------------------------------

      vat: {
        field: 'vat',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 21.0000
      },
      amountLine: {
        field: 'amount_line',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
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

    await queryInterface.addIndex(SALESINVOICELINE_TABLE, ['code_document', 'line_no'], {
      unique: true,
      name: 'sales_invoice_lines_code_line_unique'
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(SALESINVOICELINE_TABLE);
    // IMPORTANTE: Limpiar los ENUMs en Postgres al revertir
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoice_lines_unit_measure";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoice_lines_tax_type";');
  }
};
