'use strict';

const { PURCHINVOICELINE_TABLE } = require('../models/purchInvoiceLine.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(PURCHINVOICELINE_TABLE, {
      code_invoice: { // Clave compuesta y foránea
        field: 'code_invoice',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING,
        references: {
          model: 'purch_invoices',
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      line_no: {
        field: 'line_no',
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      item_code: {
        field: 'item_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true, // Flexibilidad para compras genéricas
      },
      quantity: {
        field: 'quantity',
        type: Sequelize.DataTypes.DECIMAL(10, 2), // Estandarizado a DECIMAL
        allowNull: false,
        defaultValue: 0.00
      },
      unit_measure: {
        field: 'unit_measure',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'UNIDAD'
      },
      quantity_unit_measure: {
        field: 'quantity_unit_measure',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      unit_price: {
        field: 'unit_price',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      vat: {
        field: 'vat',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      amount_line: {
        field: 'amount_line',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      user_name: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
        allowNull: true, // Opcional en el guardado inicial
      },
      created_at: {
        field: 'created_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        field: 'updated_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(PURCHINVOICELINE_TABLE);
  }
};
