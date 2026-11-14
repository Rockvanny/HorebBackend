'use strict';

/**
 * Corrección de gastos operativos cerrados (ver
 * operatingExpenses.service.js#correct). Un gasto validado o de un mes ya
 * cerrado no se modifica: se crea un gasto de AJUSTE en el mes abierto, con
 * los importes en negativo, que apunta al original (corrects_id) y guarda
 * el motivo. Así el mes cerrado (estadísticas y Excel ya entregado a la
 * gestoría) no cambia y la corrección queda registrada. Idempotente.
 */
const COLUMNS = {
  corrects_id: (T) => ({ type: T.INTEGER, allowNull: true }),
  correction_reason: (T) => ({ type: T.STRING(300), allowNull: true })
};

module.exports = {
  up: async ({ context: queryInterface }) => {
    const { DataTypes } = require('sequelize');
    const table = await queryInterface.describeTable('operating_expenses');
    for (const [name, def] of Object.entries(COLUMNS)) {
      if (!table[name]) await queryInterface.addColumn('operating_expenses', name, def(DataTypes));
    }
    // Un gasto solo se corrige una vez (un único ajuste por original)
    const indexes = await queryInterface.showIndex('operating_expenses');
    if (!indexes.some(i => i.name === 'operating_expenses_corrects_id_unique')) {
      await queryInterface.addIndex('operating_expenses', ['corrects_id'], {
        name: 'operating_expenses_corrects_id_unique',
        unique: true,
        where: { corrects_id: { [require('sequelize').Op.ne]: null } }
      });
    }
  },

  down: async ({ context: queryInterface }) => {
    const indexes = await queryInterface.showIndex('operating_expenses');
    if (indexes.some(i => i.name === 'operating_expenses_corrects_id_unique')) {
      await queryInterface.removeIndex('operating_expenses', 'operating_expenses_corrects_id_unique');
    }
    const table = await queryInterface.describeTable('operating_expenses');
    for (const name of Object.keys(COLUMNS)) {
      if (table[name]) await queryInterface.removeColumn('operating_expenses', name);
    }
  }
};
