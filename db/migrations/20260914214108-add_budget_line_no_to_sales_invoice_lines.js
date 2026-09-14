'use strict';
const { DataTypes } = require('sequelize');

// Vincula cada línea de factura con la línea de presupuesto de la que
// proviene (si el usuario la insertó desde el selector de líneas
// pendientes, ver salesBudgetLines.router.js#/:codeDocument/pending). Junto
// con sales_invoices.budget_code (ya existente) identifica el origen
// exacto: no lleva FK física porque salesBudgetLine tiene PK compuesta
// (code_document + line_no) y aquí solo se guarda la mitad (line_no); el
// code_document ya vive en la cabecera de la factura.
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('sales_invoice_lines', 'budget_line_no', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('sales_invoice_lines', 'budget_line_no');
  }
};
