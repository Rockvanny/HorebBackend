'use strict';

/**
 * Descuento por línea (% sobre cantidad × precio) en presupuestos, facturas
 * y abonos de venta y compra. La base de la línea ya lleva el descuento
 * aplicado; impuesto y retención se calculan sobre ella (ver
 * libs/taxCalculation.js). 0 en las líneas existentes. Idempotente.
 */
const LINE_TABLES = ['sales_budget_lines', 'sales_invoice_lines', 'sales_post_invoice_lines', 'purch_invoice_lines', 'purch_post_invoice_lines'];

module.exports = {
  up: async ({ context: queryInterface }) => {
    const { DataTypes } = require('sequelize');
    for (const table of LINE_TABLES) {
      const columns = await queryInterface.describeTable(table);
      if (!columns.discount) {
        await queryInterface.addColumn(table, 'discount', { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 });
      }
    }
  },

  down: async ({ context: queryInterface }) => {
    for (const table of LINE_TABLES) {
      const columns = await queryInterface.describeTable(table);
      if (columns.discount) await queryInterface.removeColumn(table, 'discount');
    }
  }
};
