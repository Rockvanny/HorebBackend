// schemas/purchPostInvoiceLine.schema.js
const Joi = require('joi');

// ===============================================
// 1. DEFINICIÓN DE ATRIBUTOS INDIVIDUALES
// ===============================================
const codeDocument = Joi.string();
const lineNo = Joi.number().integer();
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('');

// Cambiado a precision(4) para soportar los decimales definidos en la DB (DECIMAL(12,4))
const quantity = Joi.number().precision(4);
const unitMeasure = Joi.string().valid(
  'UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO',
  'METRO2', 'KILOGRAMO', 'LITRO', 'PACK'
);
const quantityUnitMeasure = Joi.number().precision(4);
const unitPrice = Joi.number().precision(4);
const taxType = Joi.string().valid('IVA', 'IRPF', 'RE', 'EXENTO');
const vat = Joi.number().precision(4);
const amountLine = Joi.number().precision(4);
const userName = Joi.string();

const limit = Joi.number().integer();
const offset = Joi.number().integer();

// ===============================================
// 2. ESQUEMAS DE VALIDACIÓN
// ===============================================

// CORREGIDO: Ya no se busca por ID. Se busca mediante la clave compuesta.
const getPurchPostInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
});

// Crear registro en histórico (Bulk insert desde el servicio o anidado en cabecera)
const createPurchPostInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: quantity.default(0),
  unitMeasure: unitMeasure.default('UNIDAD'),
  quantityUnitMeasure: quantityUnitMeasure.default(1),
  unitPrice: unitPrice.default(0),
  taxType: taxType.default('IVA'),
  vat: vat.default(21),
  amountLine: amountLine.default(0),
  userName: userName.optional(),
});

// Consulta de líneas (Paginación)
const queryPurchPostInvoiceLineSchema = Joi.object({
  limit,
  offset
});

module.exports = {
  getPurchPostInvoiceLineSchema,
  createPurchPostInvoiceLineSchema,
  queryPurchPostInvoiceLineSchema
};
