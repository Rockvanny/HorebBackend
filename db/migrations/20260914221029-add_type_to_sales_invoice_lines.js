'use strict';
const { DataTypes } = require('sequelize');

// Mismo campo que sales_budget_lines.type. Ver db/models/salesInvoiceLine.model.js.
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('sales_invoice_lines', 'type', {
      type: DataTypes.ENUM('PRODUCTO', 'COMENTARIO'),
      allowNull: false,
      defaultValue: 'PRODUCTO'
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('sales_invoice_lines', 'type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoice_lines_type";');
  }
};
