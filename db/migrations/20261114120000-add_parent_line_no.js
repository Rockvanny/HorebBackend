'use strict';

/**
 * Línea de la factura origen de la que sale cada línea de un abono
 * (parent_line_no), igual que budget_line_no enlaza con el presupuesto.
 * Junto con parent_code de la cabecera identifica la línea corregida y
 * permite saber cuánto queda por abonar de cada línea (ver
 * salesPostInvoice.service.js#getCreditableLines). Los abonos anteriores no
 * la tienen: no cuentan como abonado por línea. Idempotente.
 */
const TABLES = ['sales_invoice_lines', 'sales_post_invoice_lines'];

module.exports = {
  up: async ({ context: queryInterface }) => {
    const { DataTypes } = require('sequelize');
    for (const table of TABLES) {
      const columns = await queryInterface.describeTable(table);
      if (!columns.parent_line_no) {
        await queryInterface.addColumn(table, 'parent_line_no', { type: DataTypes.INTEGER, allowNull: true });
      }
    }
  },

  down: async ({ context: queryInterface }) => {
    for (const table of TABLES) {
      const columns = await queryInterface.describeTable(table);
      if (columns.parent_line_no) await queryInterface.removeColumn(table, 'parent_line_no');
    }
  }
};
