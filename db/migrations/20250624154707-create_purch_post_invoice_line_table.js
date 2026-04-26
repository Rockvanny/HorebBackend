'use strict';

const { SALESPOSTINVOICELINE_TABLE } = require('../models/salesPostInvoiceLine.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESPOSTINVOICELINE_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER,
      },
      codeDocument: {
        field: 'code_document',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
        references: {
          model: 'sales_post_invoices', // Referencia a la tabla registrada
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lineNo: {
        field: 'line_no',
        allowNull: false,
        type: Sequelize.DataTypes.INTEGER,
      },
      codeItem: {
        field: 'item_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      description: {
        field: 'description',
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      quantity: {
        field: 'quantity',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      unitMeasure: {
        field: 'unit_measure',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'UNIDAD'
      },
      quantityUnitMeasure: {
        field: 'quantity_unit_measure',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 1.0000
      },
      unitPrice: {
        field: 'unit_price',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },

      // --- NUEVA COLUMNA PARA EL HISTÓRICO FISCAL ---
      taxType: {
        field: 'tax_type',
        type: Sequelize.DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
        allowNull: false,
        defaultValue: 'IVA'
      },
      // ----------------------------------------------

      vat: {
        field: 'vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amountLine: {
        field: 'amount_line',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      username: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
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

    // Índice único para asegurar que no se repitan líneas por factura
    await queryInterface.addIndex(SALESPOSTINVOICELINE_TABLE, ['code_document', 'line_no'], {
      unique: true,
      name: 'sales_post_invoice_lines_code_line_unique'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(SALESPOSTINVOICELINE_TABLE);
    // Borramos el ENUM solo si no lo comparten otras tablas
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_post_invoice_lines_tax_type";');
  }
};
