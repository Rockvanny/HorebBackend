'use strict';
const { DataTypes } = require('sequelize');

// Mismo campo que sales_invoice_lines.budget_line_no: se propaga aquí al
// registrar la factura (archiveInvoice -> salesPostInvoice.service#create)
// para poder calcular cuánto se ha facturado de cada línea de presupuesto
// contra el histórico definitivo, no contra borradores.
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('sales_post_invoice_lines', 'budget_line_no', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('sales_post_invoice_lines', 'budget_line_no');
  }
};
