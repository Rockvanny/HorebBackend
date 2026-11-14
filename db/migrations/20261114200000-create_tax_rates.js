'use strict';

/**
 * Impuestos editables (Configuración › Impuestos) y retención por línea.
 *
 * Antes: tax_type era un ENUM ('IVA','IRPF','RE','EXENTO') en las 5 tablas
 * de líneas y en productos, con un único impuesto por línea (una línea con
 * IRPF se quedaba sin IVA) y el porcentaje escrito a mano.
 *
 * Ahora:
 *  - tax_rates: catálogo de tipos (código, nombre, clase fiscal,
 *    porcentaje, causa de exención, por defecto, activo, orden). La clase
 *    fiscal (IVA, EXENTO, RECARGO, RETENCION) decide el cálculo y lo que se
 *    declara en Veri*factu; el código y el nombre los pone cada empresa
 *    (IVA, IGIC, ReteFuente...). Se cargan los tipos españoles habituales.
 *  - Líneas y productos: tax_type pasa a VARCHAR y se añade una retención
 *    opcional (withholding_type, withholding_percentage). La línea guarda
 *    COPIA del código y el porcentaje: editar el catálogo no cambia
 *    documentos ya hechos.
 *  - products.vat: de entero a decimal (5,2 % o 1,4 % del recargo).
 *  - document_taxes: copia de la clase fiscal y la causa de exención de
 *    cada fila del desglose (Veri*factu la lee de aquí).
 *
 * Idempotente y en una transacción.
 */

const RATES = [
  // code, name, class, percentage, exemption cause, default
  ['IVA', 'IVA general', 'IVA', 21, null, true],
  ['IVA', 'IVA reducido', 'IVA', 10, null, false],
  ['IVA', 'IVA superreducido', 'IVA', 4, null, false],
  ['EXENTO', 'Exento (art. 20 LIVA)', 'EXENTO', 0, 'E1', false],
  ['RE', 'Recargo de equivalencia 5,2 %', 'RECARGO', 5.2, null, false],
  ['RE', 'Recargo de equivalencia 1,4 %', 'RECARGO', 1.4, null, false],
  ['RE', 'Recargo de equivalencia 0,5 %', 'RECARGO', 0.5, null, false],
  ['IRPF', 'Retención profesionales', 'RETENCION', 15, null, false],
  ['IRPF', 'Retención nuevos autónomos', 'RETENCION', 7, null, false],
  ['IRPF', 'Retención alquileres', 'RETENCION', 19, null, false]
];

// Clase de los códigos que ya existían (ver libs/taxClasses.js)
const LEGACY_CLASS_SQL = `CASE upper(code) WHEN 'IRPF' THEN 'RETENCION' WHEN 'EXENTO' THEN 'EXENTO' WHEN 'RE' THEN 'RECARGO' ELSE 'IVA' END`;

const LINE_TABLES = ['sales_budget_lines', 'sales_invoice_lines', 'sales_post_invoice_lines', 'purch_invoice_lines', 'purch_post_invoice_lines'];
const TAX_TYPE_TABLES = [...LINE_TABLES, 'products'];

module.exports = {
  up: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      const q = (sql, replacements) => sequelize.query(sql, { transaction, replacements });
      const columnInfo = async (table, column) => {
        const [[info]] = await q(`SELECT udt_name FROM information_schema.columns
                                  WHERE table_schema = 'public' AND table_name = :table AND column_name = :column;`, { table, column });
        return info;
      };

      await q(`
        CREATE TABLE IF NOT EXISTS tax_rates (
          id SERIAL PRIMARY KEY,
          code VARCHAR(20) NOT NULL,
          name VARCHAR(80) NOT NULL,
          tax_class VARCHAR(12) NOT NULL CHECK (tax_class IN ('IVA', 'EXENTO', 'RECARGO', 'RETENCION')),
          percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
          exemption_cause VARCHAR(2) CHECK (exemption_cause IN ('E1', 'E2', 'E3', 'E4', 'E5', 'E6')),
          is_default BOOLEAN NOT NULL DEFAULT false,
          active BOOLEAN NOT NULL DEFAULT true,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT tax_rates_code_percentage_key UNIQUE (code, percentage)
        );`);

      for (const [index, [code, name, taxClass, percentage, cause, isDefault]] of RATES.entries()) {
        await q(`INSERT INTO tax_rates (code, name, tax_class, percentage, exemption_cause, is_default, sort_order)
                 VALUES (:code, :name, :taxClass, :percentage, :cause, :isDefault, :order)
                 ON CONFLICT (code, percentage) DO NOTHING;`,
        { code, name, taxClass, percentage, cause, isDefault, order: (index + 1) * 10 });
      }

      // tax_type: ENUM -> VARCHAR (con su valor por defecto)
      for (const table of TAX_TYPE_TABLES) {
        const info = await columnInfo(table, 'tax_type');
        if (!info || info.udt_name === 'varchar') continue;
        await q(`ALTER TABLE ${table} ALTER COLUMN tax_type DROP DEFAULT;`);
        await q(`ALTER TABLE ${table} ALTER COLUMN tax_type TYPE VARCHAR(20) USING tax_type::text;`);
        await q(`ALTER TABLE ${table} ALTER COLUMN tax_type SET DEFAULT 'IVA';`);
        await q(`DROP TYPE IF EXISTS "${info.udt_name}";`);
      }

      // products.vat: entero -> decimal
      const productVat = await columnInfo('products', 'vat');
      if (productVat && productVat.udt_name !== 'numeric') {
        await q('ALTER TABLE products ALTER COLUMN vat TYPE NUMERIC(5, 2) USING vat::numeric;');
      }

      // Retención opcional en líneas y productos
      for (const table of TAX_TYPE_TABLES) {
        if (!(await columnInfo(table, 'tax_type'))) continue;
        if (!(await columnInfo(table, 'withholding_type'))) {
          await q(`ALTER TABLE ${table} ADD COLUMN withholding_type VARCHAR(20);`);
        }
        if (!(await columnInfo(table, 'withholding_percentage'))) {
          await q(`ALTER TABLE ${table} ADD COLUMN withholding_percentage NUMERIC(5, 2);`);
        }
      }

      // Desglose: copia de la clase fiscal y la causa de exención
      if (!(await columnInfo('document_taxes', 'tax_class'))) {
        await q('ALTER TABLE document_taxes ADD COLUMN tax_class VARCHAR(12);');
      }
      if (!(await columnInfo('document_taxes', 'exemption_cause'))) {
        await q('ALTER TABLE document_taxes ADD COLUMN exemption_cause VARCHAR(2);');
      }
      await q(`UPDATE document_taxes SET tax_class = ${LEGACY_CLASS_SQL.replace(/code/g, 'tax_type')} WHERE tax_class IS NULL;`);
      await q(`UPDATE document_taxes SET exemption_cause = 'E1' WHERE tax_class = 'EXENTO' AND exemption_cause IS NULL;`);

      // Combinaciones ya usadas que no estén en el catálogo (p.ej. un IVA al
      // 8 % escrito a mano): se añaden para poder seguir eligiéndolas
      const used = [
        ...LINE_TABLES.map(t => `SELECT tax_type AS code, vat AS percentage FROM ${t}`),
        'SELECT tax_type, vat FROM products',
        'SELECT tax_type, tax_percentage FROM document_taxes'
      ].join(' UNION ');
      await q(`INSERT INTO tax_rates (code, name, tax_class, percentage, exemption_cause, sort_order)
               SELECT code, code || ' ' || trim(to_char(percentage, 'FM990.99'), '.') || ' %',
                      ${LEGACY_CLASS_SQL}, percentage,
                      CASE WHEN upper(code) = 'EXENTO' THEN 'E1' END, 1000
               FROM (SELECT DISTINCT code, round(percentage::numeric, 2) AS percentage FROM (${used}) u
                     WHERE code IS NOT NULL AND percentage IS NOT NULL AND percentage BETWEEN 0 AND 100) d
               ON CONFLICT (code, percentage) DO NOTHING;`);
    });
  },

  down: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      const q = (sql) => sequelize.query(sql, { transaction });
      for (const table of TAX_TYPE_TABLES) {
        await q(`ALTER TABLE ${table} DROP COLUMN IF EXISTS withholding_type;`);
        await q(`ALTER TABLE ${table} DROP COLUMN IF EXISTS withholding_percentage;`);
        // Falla si hay códigos nuevos en uso: hay que cambiarlos antes
        const type = `enum_${table}_tax_type`;
        await q(`DO $$ BEGIN CREATE TYPE "${type}" AS ENUM ('IVA', 'IRPF', 'RE', 'EXENTO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
        await q(`ALTER TABLE ${table} ALTER COLUMN tax_type DROP DEFAULT;`);
        await q(`ALTER TABLE ${table} ALTER COLUMN tax_type TYPE "${type}" USING tax_type::"${type}";`);
        await q(`ALTER TABLE ${table} ALTER COLUMN tax_type SET DEFAULT 'IVA';`);
      }
      await q('ALTER TABLE products ALTER COLUMN vat TYPE INTEGER USING round(vat)::integer;');
      await q('ALTER TABLE document_taxes DROP COLUMN IF EXISTS tax_class;');
      await q('ALTER TABLE document_taxes DROP COLUMN IF EXISTS exemption_cause;');
      await q('DROP TABLE IF EXISTS tax_rates;');
    });
  }
};
