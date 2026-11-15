'use strict';

/**
 * Resolución de numeración de la DIAN (Colombia) en las series: la DIAN
 * autoriza un prefijo y un rango de números con una vigencia, y el software
 * numera las facturas de forma consecutiva dentro de ese rango (ver
 * libs/sequence.handler.js). Columnas nuevas co_dian_*, todas opcionales:
 * una serie sin rango es una serie normal (España y resto de series).
 * La vigencia de la resolución son las fechas de la serie (from_date,
 * to_date). Idempotente.
 */
const COLUMNS = {
  co_dian_resolution: 'VARCHAR(30)',      // nº de la resolución
  co_dian_resolution_date: 'DATE',        // fecha de expedición
  co_dian_prefix: 'VARCHAR(4)',           // prefijo autorizado (puede no haber)
  co_dian_range_from: 'BIGINT',           // primer número autorizado
  co_dian_range_to: 'BIGINT',             // último número autorizado
  co_dian_technical_key: 'VARCHAR(100)'   // clave técnica (cálculo del CUFE)
};

module.exports = {
  up: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      for (const [column, type] of Object.entries(COLUMNS)) {
        await sequelize.query(`ALTER TABLE series_numbers ADD COLUMN IF NOT EXISTS ${column} ${type};`, { transaction });
      }
    });
  },

  down: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      for (const column of Object.keys(COLUMNS)) {
        await sequelize.query(`ALTER TABLE series_numbers DROP COLUMN IF EXISTS ${column};`, { transaction });
      }
    });
  }
};
