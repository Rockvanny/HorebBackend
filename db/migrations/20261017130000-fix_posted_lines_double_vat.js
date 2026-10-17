'use strict';

/**
 * Hasta el arreglo en salesPostInvoice.service.js / purchPostInvoice.service.js
 * (2026-10-17), al registrar una factura se trataba el amountLine del
 * borrador -que ya es el importe final de la línea, base +IVA / -IRPF- como
 * si fuera la base, y se le volvía a sumar el IVA:
 *     amount_line_guardado = importe_correcto * (1 + vat / 100)
 * Las cabeceras, document_taxes y Veri*factu se calculaban aparte y están
 * bien; solo quedó inflado amount_line de las líneas registradas (y por tanto
 * lo que se imprime en cada línea, que no cuadraba con el total).
 *
 * Se corrige dividiendo entre (1 + vat / 100), pero SOLO en las facturas que
 * tienen exactamente ese error: la suma de sus líneas no cuadra con
 * amount_with_vat y, una vez deshecho el IVA duplicado, sí cuadra. Las
 * registradas después del arreglo ya cuadran y no se tocan, así que la
 * migración es idempotente.
 */

const TABLES = [
  { header: 'sales_post_invoices', lines: 'sales_post_invoice_lines' },
  { header: 'purch_post_invoices', lines: 'purch_post_invoice_lines' }
];

const TOLERANCE = 0.01;

module.exports = {
  up: async ({ context: queryInterface }) => {
    for (const { header, lines } of TABLES) {
      await queryInterface.sequelize.query(`
        WITH affected AS (
          SELECT h.code
          FROM ${header} h
          JOIN ${lines} l ON l.code_document = h.code
          GROUP BY h.code, h.amount_with_vat
          HAVING ABS(SUM(l.amount_line) - h.amount_with_vat) > ${TOLERANCE}
             AND ABS(SUM(l.amount_line / (1 + l.vat / 100)) - h.amount_with_vat) <= ${TOLERANCE}
        )
        UPDATE ${lines} l
        SET amount_line = ROUND(l.amount_line / (1 + l.vat / 100), 4),
            updated_at = NOW()
        FROM affected a
        WHERE l.code_document = a.code;
      `);
    }
  },

  down: async () => {
    // Sin vuelta atrás: no hay forma de distinguir después qué líneas se
    // corrigieron, y volver a inflarlas solo reintroduciría el error.
  }
};
