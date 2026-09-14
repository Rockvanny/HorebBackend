'use strict';
const { DataTypes } = require('sequelize');

// PRODUCTO (por defecto, comportamiento actual) vs COMENTARIO (línea de
// solo texto libre en 'description', sin cantidad/precio, no suma a
// totales). Ver db/models/salesBudgetLines.model.js.
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('sales_budget_lines', 'type', {
      type: DataTypes.ENUM('PRODUCTO', 'COMENTARIO'),
      allowNull: false,
      defaultValue: 'PRODUCTO'
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn('sales_budget_lines', 'type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_budget_lines_type";');
  }
};
