'use strict';
const { DataTypes, literal } = require('sequelize');
const { SALESBUDGETLINE_TABLE } = require('../models/salesBudgetLines.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(SALESBUDGETLINE_TABLE, {
      codeDocument: {
        field: 'code_document',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.STRING,
        references: {
          model: 'sales_budgets',
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lineNo: {
        field: 'line_no',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      itemCode: {
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
      unitPrice: {
        field: 'unit_price',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      taxType: {
        field: 'tax_type',
        allowNull: false,
        type: DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
        defaultValue: 'IVA'
      },
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

    await queryInterface.addIndex(SALESBUDGETLINE_TABLE, ['code_document']);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(SALESBUDGETLINE_TABLE);
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_budget_lines_unit_measure";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_budget_lines_tax_type";');
  }
};
