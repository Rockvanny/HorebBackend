'use strict';

const { PURCHINVOICELINE_TABLE } = require('../models/purchInvoiceLine.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(PURCHINVOICELINE_TABLE, {
      code_invoice: {
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
        allowNull: true, // Cambiado a true para normalizar con ofertas/ventas
      },
      description: {
        type: Sequelize.DataTypes.TEXT, // Cambiado a TEXT para descripciones largas de proveedores
        allowNull: true,
      },
      // Estandarizado a precisión (12, 4) para evitar descuadres en facturas complejas
      quantity: {
        field: 'quantity',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      unit_measure: {
        field: 'unit_measure',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'UNIDAD'
      },
      quantity_unit_measure: {
        field: 'quantity_unit_measure',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 1.0000 // Valor base 1 para multiplicaciones seguras
      },
      unit_price: {
        field: 'unit_price',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      vat: {
        field: 'vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amount_line: {
        field: 'amount_line',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      user_name: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
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
