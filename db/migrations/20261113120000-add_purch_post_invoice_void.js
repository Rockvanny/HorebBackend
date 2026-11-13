'use strict';

/**
 * Anulación interna de facturas de compra registradas (ver
 * purchPostInvoice.service.js#void). Las compras no van a Veri*factu ni
 * tienen efecto fiscal en Horeb: si una se registró por error (p. ej. un
 * gasto operativo metido como compra), se anula en vez de inventar un
 * abono del proveedor. La factura no se borra: queda marcada con quién,
 * cuándo y por qué, y deja de contar en estadísticas, saldos y el Excel.
 * Idempotente: solo añade las columnas que falten.
 */
const COLUMNS = {
  voided_at: (DataTypes) => ({ type: DataTypes.DATE, allowNull: true }),
  voided_by: (DataTypes) => ({ type: DataTypes.STRING, allowNull: true }),
  void_reason: (DataTypes) => ({ type: DataTypes.STRING(300), allowNull: true })
};

module.exports = {
  up: async ({ context: queryInterface }) => {
    const { DataTypes } = require('sequelize');
    const table = await queryInterface.describeTable('purch_post_invoices');
    for (const [name, def] of Object.entries(COLUMNS)) {
      if (!table[name]) await queryInterface.addColumn('purch_post_invoices', name, def(DataTypes));
    }
  },

  down: async ({ context: queryInterface }) => {
    const table = await queryInterface.describeTable('purch_post_invoices');
    for (const name of Object.keys(COLUMNS)) {
      if (table[name]) await queryInterface.removeColumn('purch_post_invoices', name);
    }
  }
};
