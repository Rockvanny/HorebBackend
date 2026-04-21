const Joi = require('joi');

/**
 * Definiciones base normalizadas (Igualadas al borrador)
 * Usamos precisión 4 para evitar descuadres legales.
 */
const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().precision(4);
const unitMeasure = Joi.string().allow('', null).default('UNIDAD');
const quantityUnitMeasure = Joi.number().precision(4).default(1);
const unitPrice = Joi.number().precision(4);
const vat = Joi.number().min(0).max(100).precision(4).default(21);
const amountLine = Joi.number().precision(4);
const username = Joi.string().allow('', null);

// Esquema para obtener una línea específica
const getSalesPostInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
});

/**
 * ESQUEMA DE CREACIÓN
 * En la factura registrada, casi todos los campos son obligatorios
 * para garantizar la integridad del documento legal.
 */
const createSalesPostInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(), // Siempre requerido en el registro oficial
  lineNo: lineNo.required(),
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.required(),
  quantityUnitMeasure: quantityUnitMeasure.required(),
  unitPrice: unitPrice.required(),
  vat: vat.required(),
  amountLine: amountLine.required(),
  username: username.optional(),
});

// Esquema de consulta (Paginación)
const querySalesPostInvoiceLineSchema = Joi.object({
  limit: Joi.number().integer(),
  offset: Joi.number().integer(),
  searchTerm: Joi.string().allow('').optional()
});

module.exports = {
  getSalesPostInvoiceLineSchema,
  createSalesPostInvoiceLineSchema,
  querySalesPostInvoiceLineSchema,
  // No exportamos updateSalesPostInvoiceLineSchema porque no es editable
};
