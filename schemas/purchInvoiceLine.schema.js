const Joi = require('joi');

// --- DEFINICIÓN DE TIPOS BASE ---
const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().precision(4); // Quitamos min(0) por si hay devoluciones
const unitMeasure = Joi.string().allow('', null).default('UNIDAD');
const quantityUnitMeasure = Joi.number().min(0).precision(4).default(1);
const unitPrice = Joi.number().precision(4);
// Nuevo: Soporte para tipo de impuesto (IVA, IRPF, etc)
const taxType = Joi.string().valid('IVA', 'IRPF', 'RE', 'EXENTO').default('IVA');
const vat = Joi.number().min(0).max(100).precision(4).default(21);
const amountLine = Joi.number().precision(4);
const userName = Joi.string().allow('', null); // Sincronizado con el modelo

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
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure: quantityUnitMeasure.optional(),
  unitPrice: unitPrice.required(),
  taxType: taxType.optional(), // Añadido
  vat: vat.optional(),
  amountLine: amountLine.required(),
  userName: userName.optional(), // Corregido camelCase
});

/**
 * Esquema para ACTUALIZACIÓN
 */
const updatePurchInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.optional(),
  lineNo: lineNo.optional(),
  codeItem: codeItem.optional(),
  description: description.optional(),
  quantity: quantity.optional(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure: quantityUnitMeasure.optional(),
  unitPrice: unitPrice.optional(),
  taxType: taxType.optional(), // Añadido
  vat: vat.optional(),
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
