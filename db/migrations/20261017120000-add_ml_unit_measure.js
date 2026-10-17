'use strict';

/**
 * 'ML' (metros lineales) ya estaba en el ENUM unitMeasure de los seis
 * modelos Sequelize -y por tanto en los desplegables del front, que se
 * rellenan desde /enums- y libs/taxCalculation.js ya la calcula igual que
 * METRO (cantidad x factor x precio), pero las migraciones originales solo
 * la crearon en purch_post_invoice_lines. En el resto de tablas, elegir ML
 * reventaba el INSERT con "invalid input value for enum".
 *
 * Solo añade un valor permitido al tipo: no toca ninguna fila existente ni
 * reescribe las tablas. IF NOT EXISTS lo hace idempotente (purch_post_
 * invoice_lines ya lo tiene y queda igual).
 */

const ENUM_TYPES = [
  'enum_products_unit_measure',
  'enum_sales_budget_lines_unit_measure',
  'enum_sales_invoice_lines_unit_measure',
  'enum_sales_post_invoice_lines_unit_measure',
  'enum_purch_invoice_lines_unit_measure',
  'enum_purch_post_invoice_lines_unit_measure'
];

module.exports = {
  up: async ({ context: queryInterface }) => {
    for (const enumType of ENUM_TYPES) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "${enumType}" ADD VALUE IF NOT EXISTS 'ML';`
      );
    }
  },

  down: async () => {
    // Sin vuelta atrás: Postgres no permite quitar un valor de un ENUM sin
    // recrear el tipo, y si ya hay filas guardadas con 'ML' ese recast
    // fallaría. Dejar el valor disponible sin usarlo no afecta a nada.
  }
};
