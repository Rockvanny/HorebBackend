const Joi = require('joi');
const { taxCode, withholdingType, withholdingPercentage } = require('./taxRate.schema');

// --- DEFINICIÓN DE TIPOS BASE ---
const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().precision(4); // Quitamos min(0) por si hay devoluciones
const unitMeasure = Joi.string().allow('', null).default('UNIDAD');
const unitPrice = Joi.number().precision(4);
// Nuevo: Soporte para tipo de impuesto (IVA, IRPF, etc)
// Código de impuesto del catálogo editable (ver taxRate.schema.js)
const taxType = taxCode.default('IVA');
const vat = Joi.number().min(0).max(100).precision(4).default(21);
const amountLine = Joi.number().precision(4);
const userName = Joi.string().allow('', null); // Sincronizado con el modelo

// PRODUCTO: línea normal con cantidad/precio. COMENTARIO: solo texto libre
// en 'description' — el resto de campos no aplica (ver
// requiredUnlessComment y libs/taxCalculation.js, que no suma estas
// líneas a los totales).
const type = Joi.string().valid('PRODUCTO', 'COMENTARIO').default('PRODUCTO');

const requiredUnlessComment = (schema) =>
  schema.when('type', { is: 'COMENTARIO', then: Joi.optional().allow(null), otherwise: Joi.required() });

// Mismo criterio que salesInvoiceLine.schema.js: quantityUnitMeasure solo
// importa para METRO/ML, width/height solo para METRO2, y ninguno se exige en
// una línea COMENTARIO. El front manda las tres columnas siempre (null si
// no aplican, ver transactionLinesHandler.js#getLinesData) y
// libs/taxCalculation.js las normaliza antes de guardar. Antes este schema
// no conocía width/height y no aceptaba null en quantityUnitMeasure, así
// que todo guardado de factura/abono de compra desde el front daba 400.
const quantityUnitMeasure = Joi.number().min(0).precision(4)
  .when('type', {
    is: 'COMENTARIO',
    then: Joi.optional().allow(null),
    otherwise: Joi.when('unitMeasure', { is: Joi.valid('METRO', 'ML'), then: Joi.required(), otherwise: Joi.optional().allow(null) })
  });

const width = Joi.number().min(0).precision(4)
  .when('type', {
    is: 'COMENTARIO',
    then: Joi.optional().allow(null),
    otherwise: Joi.when('unitMeasure', { is: 'METRO2', then: Joi.required(), otherwise: Joi.optional().allow(null) })
  });

const height = Joi.number().min(0).precision(4)
  .when('type', {
    is: 'COMENTARIO',
    then: Joi.optional().allow(null),
    otherwise: Joi.when('unitMeasure', { is: 'METRO2', then: Joi.required(), otherwise: Joi.optional().allow(null) })
  });

// --- ESQUEMAS DE ACCIÓN ---

/**
 * Esquema para obtener un registro por su clave compuesta
 */
const getPurchInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
});

/**
 * Esquema para CREACIÓN
 */
const createPurchInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.optional().allow('', null),
  lineNo: lineNo.required(),
  type: type.optional(),
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: requiredUnlessComment(quantity),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure,
  width,
  height,
  unitPrice: requiredUnlessComment(unitPrice),
  taxType: taxType.optional(), // Añadido
  vat: vat.optional(),
  withholdingType,
  withholdingPercentage,
  amountLine: amountLine.required(),
  userName: userName.optional(), // Corregido camelCase
});

/**
 * Esquema para ACTUALIZACIÓN
 */
const updatePurchInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.optional(),
  lineNo: lineNo.optional(),
  type: type.optional(),
  codeItem: codeItem.optional(),
  description: description.optional(),
  quantity: quantity.optional(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure,
  width,
  height,
  unitPrice: unitPrice.optional(),
  taxType: taxType.optional(), // Añadido
  vat: vat.optional(),
  withholdingType,
  withholdingPercentage,
  amountLine: amountLine.optional(),
  userName: userName.optional(), // Corregido camelCase
});

/**
 * Esquema para filtrado y paginación
 */
const queryPurchInvoiceLineSchema = Joi.object({
  limit: Joi.number().integer(),
  offset: Joi.number().integer(),
  searchTerm: Joi.string().allow('').optional(),
});

module.exports = {
  getPurchInvoiceLineSchema,
  createPurchInvoiceLineSchema,
  updatePurchInvoiceLineSchema,
  queryPurchInvoiceLineSchema
};
