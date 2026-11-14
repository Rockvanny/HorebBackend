/**
 * Clases fiscales de los impuestos (columna tax_class de tax_rates y de
 * document_taxes). El código y el nombre de cada impuesto los pone cada
 * empresa (IVA, IGIC, ReteFuente...); la clase es la lista fija que decide
 * cómo se calcula y qué se declara en Veri*factu:
 *  - IVA:       se suma a la base (IVA, IGIC, impuesto al consumo...).
 *  - EXENTO:    0 %, se declara como operación exenta (con su causa).
 *  - RECARGO:   recargo de equivalencia, se suma.
 *  - RETENCION: se resta (IRPF, ReteFuente...). En la línea va en su propio
 *               campo, la retención opcional (withholding_type).
 */
const TAX_CLASSES = ['IVA', 'EXENTO', 'RECARGO', 'RETENCION'];

// Causas de exención de Veri*factu (OperacionExentaType): E1 art. 20, E2
// art. 21, E3 art. 22, E4 arts. 23 y 24, E5 art. 25, E6 otros.
const EXEMPTION_CAUSES = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'];

// Clase de los códigos que existían antes del catálogo editable: para
// datos antiguos sin clase guardada.
const LEGACY_CLASS_BY_CODE = {
  IVA: 'IVA',
  IRPF: 'RETENCION',
  EXENTO: 'EXENTO',
  RE: 'RECARGO'
};

const taxClassOf = (taxType) => LEGACY_CLASS_BY_CODE[String(taxType || 'IVA').toUpperCase()] || 'IVA';

module.exports = { TAX_CLASSES, EXEMPTION_CAUSES, LEGACY_CLASS_BY_CODE, taxClassOf };
