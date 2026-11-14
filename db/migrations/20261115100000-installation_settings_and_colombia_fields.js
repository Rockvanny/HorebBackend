'use strict';

/**
 * 1. installation_settings: país, moneda y formato regional de la
 *    instalación (una sola fila). Los fija el asistente de primera
 *    instalación y no cambian después (decidido con el usuario 2026-11-15:
 *    cambiar de país dejaría fichas con los campos del otro país vacíos y
 *    cambiar de moneda alteraría el significado de los importes). Las
 *    instalaciones existentes quedan como España / EUR / es-ES.
 * 2. Campos propios de Colombia en clientes, proveedores, empresa y
 *    empleados (co_*), todos opcionales: los de España no se tocan.
 * Idempotente.
 */
const PARTY_COLUMNS = {
  co_person_type: 'VARCHAR(10)',   // NATURAL | JURIDICA
  co_id_type: 'VARCHAR(5)',        // CC, NIT, CE, PA, TI, PEP (libs/colombia.js)
  co_id_number: 'VARCHAR(20)',
  co_check_digit: 'VARCHAR(1)',    // dígito de verificación del NIT
  co_department: 'VARCHAR(2)',     // código DANE
  co_municipality: 'VARCHAR(80)',
  co_tax_regime: 'VARCHAR(20)'     // RESPONSABLE_IVA | NO_RESPONSABLE_IVA
};
const PERSON_COLUMNS = ['co_id_type', 'co_id_number', 'co_department', 'co_municipality'];

const TABLES = {
  customers: Object.keys(PARTY_COLUMNS),
  vendors: Object.keys(PARTY_COLUMNS),
  company: Object.keys(PARTY_COLUMNS),
  employees: PERSON_COLUMNS
};

module.exports = {
  up: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      const q = (sql) => sequelize.query(sql, { transaction });
      await q(`
        CREATE TABLE IF NOT EXISTS installation_settings (
          id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          country VARCHAR(5) NOT NULL DEFAULT 'ES',
          currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
          locale VARCHAR(10) NOT NULL DEFAULT 'es-ES',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );`);
      await q(`INSERT INTO installation_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;`);

      for (const [table, columns] of Object.entries(TABLES)) {
        for (const column of columns) {
          await q(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${PARTY_COLUMNS[column]};`);
        }
      }
    });
  },

  down: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      for (const [table, columns] of Object.entries(TABLES)) {
        for (const column of columns) {
          await sequelize.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column};`, { transaction });
        }
      }
      await sequelize.query('DROP TABLE IF EXISTS installation_settings;', { transaction });
    });
  }
};
