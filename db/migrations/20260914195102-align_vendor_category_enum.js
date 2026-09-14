'use strict';

/**
 * vendors.category solo tenía categorías de "obra" (Suministros de Obra,
 * Logística de Materiales, Material de Construcción, Equipamiento /
 * Maquinaria, Servicios Externos de Obra), mientras que operating_expenses.
 * category (ver 20260426101302-create_operating_expenses_table.js.bak) tiene
 * un set totalmente distinto para gasto interno (Personal y Nóminas,
 * Suministros Públicos, Vehículos y Movilidad, Alquileres e Inmuebles,
 * Herramientas de Empresa, Gastos de Oficina y Administración).
 *
 * Un proveedor real se usa para ambos casos (compras de obra y gasto interno
 * recurrente, p.ej. luz/internet), así que se añaden aquí las 6 categorías
 * de gasto interno al enum de vendors para que ambas tablas compartan
 * exactamente el mismo set de valores.
 */

const NEW_VALUES = [
  'Suministros Públicos',
  'Alquileres e Inmuebles',
  'Vehículos y Movilidad',
  'Herramientas de Empresa',
  'Personal y Nóminas',
  'Gastos de Oficina y Administración'
];

const ORIGINAL_VALUES = [
  'Suministros de Obra',
  'Logística de Materiales',
  'Material de Construcción',
  'Equipamiento / Maquinaria',
  'Servicios Externos de Obra'
];

module.exports = {
  up: async ({ context: queryInterface }) => {
    for (const value of NEW_VALUES) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_vendors_category" ADD VALUE IF NOT EXISTS '${value}';`
      );
    }
  },

  down: async ({ context: queryInterface }) => {
    // Postgres no permite quitar valores de un ENUM directamente: hay que
    // recrear el tipo con el set original y volver a castear la columna.
    await queryInterface.sequelize.query('ALTER TABLE vendors ALTER COLUMN category DROP DEFAULT;');
    await queryInterface.sequelize.query('ALTER TABLE vendors ALTER COLUMN category TYPE VARCHAR USING category::text;');
    await queryInterface.sequelize.query('DROP TYPE "enum_vendors_category";');

    const list = ORIGINAL_VALUES.map(v => `'${v}'`).join(', ');
    await queryInterface.sequelize.query(`CREATE TYPE "enum_vendors_category" AS ENUM (${list});`);
    await queryInterface.sequelize.query('ALTER TABLE vendors ALTER COLUMN category TYPE "enum_vendors_category" USING category::"enum_vendors_category";');
    await queryInterface.sequelize.query(`ALTER TABLE vendors ALTER COLUMN category SET DEFAULT 'Suministros de Obra';`);
  }
};
