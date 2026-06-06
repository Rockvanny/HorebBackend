'use strict';

const { PURCHINVOICELINE_TABLE } = require('../models/purchInvoiceLine.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(PURCHINVOICELINE_TABLE, {
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
          model: 'purch_invoices',
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
        type: Sequelize.DataTypes.ENUM('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK'),
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
      taxType: {
        field: 'tax_type',
        type: Sequelize.DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
        allowNull: false,
        defaultValue: 'IVA'
      },
      vat: {
        field: 'vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 21.0000
      },
      amountLine: {
        field: 'amount_line',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      userName: {
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

    // Índice único para evitar duplicidad de líneas en el mismo documento
    await queryInterface.addIndex(PURCHINVOICELINE_TABLE, ['code_document', 'line_no'], {
      unique: true,
      name: 'purch_invoice_lines_code_line_unique'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(PURCHINVOICELINE_TABLE);

    // Limpieza de ENUMs específicos de las líneas de compra
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoice_lines_unit_measure";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoice_lines_tax_type";');
  }
};
