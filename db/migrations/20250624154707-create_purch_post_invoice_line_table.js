'use strict';

const { PURCHPOSTINVOICELINE_TABLE } = require('../models/purchPostInvoiceLine.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(PURCHPOSTINVOICELINE_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER,
      },
      codeDocument: { // Mapeado a code_invoice para compras
        field: 'code_document',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
        references: {
          model: 'purch_post_invoices', // Referencia al histórico de cabeceras de compras
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lineNo: {
        field: 'line_no',
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
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
        defaultValue: 0
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
        defaultValue: 1
      },
      unitPrice: {
        field: 'unit_price',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0
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
        defaultValue: 21 // Ajustado según tu ejemplo de ventas
      },
      amountLine: {
        field: 'amount_line',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0
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

    // Índice único para asegurar que no se repitan líneas en un documento registrado
    await queryInterface.addIndex(PURCHPOSTINVOICELINE_TABLE, ['code_document', 'line_no'], {
      unique: true,
      name: 'purch_post_invoice_lines_unique_idx' // Simetría con el nombre de ventas
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(PURCHPOSTINVOICELINE_TABLE);
  }
};
