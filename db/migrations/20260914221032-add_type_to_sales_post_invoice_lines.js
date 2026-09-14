'use strict';
const { DataTypes } = require('sequelize');

// Heredado de sales_invoice_lines.type al registrar (archiveInvoice).
// Ver db/models/salesPostInvoiceLine.model.js.
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('sales_post_invoice_lines', 'type', {
      type: DataTypes.ENUM('PRODUCTO', 'COMENTARIO'),
      allowNull: false,
      defaultValue: 'PRODUCTO'
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('sales_post_invoice_lines', 'type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_post_invoice_lines_type";');
  }
};
