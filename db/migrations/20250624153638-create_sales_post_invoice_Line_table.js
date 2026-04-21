'use strict';

const { SALESPOSTINVOICELINE_TABLE } = require('../models/salesPostInvoiceLine.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESPOSTINVOICELINE_TABLE, {
      codeDocument: {
        field: 'code_document', // Igualado al borrador
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING,
        references: {
          model: 'sales_post_invoices', // Referencia a la tabla de cabecera registrada
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lineNo: {
        field: 'line_no',
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      codeItem: {
        field: 'item_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true, // Permitimos nulo si es una línea de texto libre
      },
      description: {
        field: 'description',
        type: Sequelize.DataTypes.TEXT, // Cambiado a TEXT para descripciones largas
        allowNull: true,
      },
      quantity: {
        field: 'quantity',
        type: Sequelize.DataTypes.DECIMAL(12, 4), // Precisión normalizada
        allowNull: false,
        defaultValue: 0
      },
      unitMeasure: {
        field: 'unit_measure',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'UNIDAD'
      },
      quantityUnitMeasure: {
        field: 'quantity_unit_measure',
        type: Sequelize.DataTypes.DECIMAL(12, 4), // Cambiado a DECIMAL para factores de conversión
        allowNull: false,
        defaultValue: 1
      },
      unitPrice: {
        field: 'unit_price',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0
      },
      vat: {
        field: 'vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 21
      },
      amountLine: {
        field: 'amount_line',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(SALESPOSTINVOICELINE_TABLE);
  }
};
