'use strict';
const { DataTypes } = require('sequelize');

// Campo nuevo de apoyo al autocompletado por código postal (ver
// Backend/services/geocoding.service.js y
// Frontend/src/renderers/utils/ui/postalCodeSuggestion.js): ninguna de estas
// 6 tablas tenía provincia hasta ahora, solo ciudad. Nullable en las 6,
// incluidas las que tienen address/city NOT NULL, porque las filas
// existentes no tienen valor y es un dato opcional (sugerencia, nunca
// obligatorio).
const TABLES = [
  'company',
  'customers',
  'vendors',
  'sales_budgets',
  'purch_invoices',
  'sales_invoices',
];

module.exports = {
  up: async ({ context: queryInterface }) => {
    for (const table of TABLES) {
      await queryInterface.addColumn(table, 'province', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
  },

  down: async ({ context: queryInterface }) => {
    for (const table of TABLES) {
      await queryInterface.removeColumn(table, 'province');
    }
  }
};
