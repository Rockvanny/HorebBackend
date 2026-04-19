const Joi = require('joi');

// --- DEFINICIÓN DE TIPOS BASE (IGUAL A OFERTA) ---
const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().min(0).precision(4);
// Ajuste para permitir null o vacío igual que en la oferta
const unitMeasure = Joi.string().allow('', null).default('UNIDAD');
const quantityUnitMeasure = Joi.number().min(0).precision(4).default(1);
const unitPrice = Joi.number().min(0).precision(4);
const vat = Joi.number().min(0).max(100).precision(4).default(21);
const amountLine = Joi.number().min(0).precision(4);
const username = Joi.string().allow('', null);

// --- ESQUEMAS DE ACCIÓN ---

/**
 * Esquema para obtener un registro por su PK
 */
const getPurchInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
});

/**
 * Esquema para CREACIÓN
 * Igualado a la oferta: codeDocument es opcional para que el Service lo inyecte
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
  vat: vat.optional(),
  amountLine: amountLine.required(),
  username: username.optional(),
});

/**
 * Esquema para ACTUALIZACIÓN (PATCH/PUT)
 * Copia exacta de updateSalesBudgetLineSchema
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
  vat: vat.optional(),
  amountLine: amountLine.optional(),
  username: username.optional(),
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
