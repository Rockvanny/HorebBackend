/**
 * Tipos de factura oficiales (ClaveTipoFacturaType de Veri*factu, ver
 * resources/verifactu-xsd/SuministroInformacion.xsd). Única fuente para
 * todos los servicios: antes cada uno tenía su copia de la lista.
 *  - INVOICED_TYPES: facturas (completa y simplificada). Suman.
 *  - CREDIT_NOTE_TYPES: rectificativas / abonos (R1-R5). Restan.
 */
const INVOICED_TYPES = Object.freeze(['F1', 'F2']);
const CREDIT_NOTE_TYPES = Object.freeze(['R1', 'R2', 'R3', 'R4', 'R5']);

const isCreditNote = (typeInvoice) => CREDIT_NOTE_TYPES.includes(typeInvoice);

module.exports = { INVOICED_TYPES, CREDIT_NOTE_TYPES, isCreditNote };
