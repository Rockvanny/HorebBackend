'use strict';

/**
 * Categorías de gasto editables (Configuración › Categorías de gasto).
 *
 * Antes eran un ENUM de Postgres con 11 valores pensados para una empresa
 * de reformas, repetido en 4 tablas (vendors, operating_expenses,
 * purch_invoices, purch_post_invoices): añadir una categoría exigía una
 * migración (ver 20260914195102-align_vendor_category_enum.js).
 *
 * Ahora:
 *  - expense_categories guarda el catálogo (nombre, gasto general, activa,
 *    orden). Se cargan las 11 de siempre.
 *  - Las 4 columnas `category` pasan a VARCHAR y siguen guardando el
 *    NOMBRE, con clave foránea a expense_categories(name):
 *      ON UPDATE CASCADE: renombrar una categoría la cambia en todos los
 *        registros (estadísticas, app Android... siguen leyendo el nombre,
 *        sin cambios).
 *      ON DELETE RESTRICT: una categoría en uso no se puede borrar; el
 *        servicio la desactiva en su lugar (ver expenseCategories.service.js).
 *  - Sin valor por defecto en las columnas: la categoría se elige siempre.
 *
 * Idempotente.
 */

const CATEGORIES = [
  // [nombre, gasto general de la empresa (sin obra: luz, alquiler, nóminas...)]
  ['Suministros de Obra', false],
  ['Logística de Materiales', false],
  ['Material de Construcción', false],
  ['Equipamiento / Maquinaria', false],
  ['Servicios Externos de Obra', false],
  ['Suministros Públicos', true],
  ['Alquileres e Inmuebles', true],
  ['Vehículos y Movilidad', true],
  ['Herramientas de Empresa', true],
  ['Personal y Nóminas', true],
  ['Gastos de Oficina y Administración', true]
];

// tabla -> [tipo ENUM anterior, valor por defecto anterior (para down)]
const TABLES = {
  vendors: ['enum_vendors_category', 'Suministros de Obra'],
  operating_expenses: ['enum_operating_expenses_category', 'Personal y Nóminas'],
  purch_invoices: ['enum_purch_invoices_category', 'Suministros de Obra'],
  purch_post_invoices: ['enum_purch_post_invoices_category', 'Suministros de Obra']
};

const fkName = (table) => `${table}_category_fkey`;

module.exports = {
  up: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      const q = (sql, replacements) => sequelize.query(sql, { transaction, replacements });

      await q(`
        CREATE TABLE IF NOT EXISTS expense_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(80) NOT NULL UNIQUE,
          is_general_expense BOOLEAN NOT NULL DEFAULT false,
          active BOOLEAN NOT NULL DEFAULT true,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );`);

      for (const [index, [name, isGeneral]] of CATEGORIES.entries()) {
        await q(`INSERT INTO expense_categories (name, is_general_expense, sort_order)
                 VALUES (:name, :isGeneral, :order) ON CONFLICT (name) DO NOTHING;`,
        { name, isGeneral, order: (index + 1) * 10 });
      }

      for (const [table, [enumType]] of Object.entries(TABLES)) {
        const [[column]] = await q(`SELECT udt_name FROM information_schema.columns
                                    WHERE table_schema = 'public' AND table_name = :table AND column_name = 'category';`, { table });
        if (!column) continue;

        if (column.udt_name !== 'varchar') {
          await q(`ALTER TABLE ${table} ALTER COLUMN category DROP DEFAULT;`);
          await q(`ALTER TABLE ${table} ALTER COLUMN category TYPE VARCHAR(80) USING category::text;`);
          await q(`DROP TYPE IF EXISTS "${enumType}";`);
        }

        // Por si algún registro tuviera un valor fuera del catálogo
        await q(`INSERT INTO expense_categories (name, sort_order)
                 SELECT DISTINCT category, 1000 FROM ${table} WHERE category IS NOT NULL
                 ON CONFLICT (name) DO NOTHING;`);

        const [existing] = await q('SELECT 1 FROM pg_constraint WHERE conname = :name;', { name: fkName(table) });
        if (!existing.length) {
          await q(`ALTER TABLE ${table} ADD CONSTRAINT ${fkName(table)} FOREIGN KEY (category)
                   REFERENCES expense_categories (name) ON UPDATE CASCADE ON DELETE RESTRICT;`);
        }
      }
    });
  },

  down: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;
    const values = CATEGORIES.map(([name]) => `'${name}'`).join(', ');
    await sequelize.transaction(async (transaction) => {
      const q = (sql) => sequelize.query(sql, { transaction });
      for (const [table, [enumType, defaultValue]] of Object.entries(TABLES)) {
        await q(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${fkName(table)};`);
        // Falla si hay registros con categorías nuevas: hay que reasignarlas antes
        await q(`DO $$ BEGIN CREATE TYPE "${enumType}" AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
        await q(`ALTER TABLE ${table} ALTER COLUMN category TYPE "${enumType}" USING category::"${enumType}";`);
        await q(`ALTER TABLE ${table} ALTER COLUMN category SET DEFAULT '${defaultValue}';`);
      }
      await q('DROP TABLE IF EXISTS expense_categories;');
    });
  }
};
