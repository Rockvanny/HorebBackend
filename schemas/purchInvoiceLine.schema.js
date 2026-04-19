const Joi = require('joi');

// Definición de tipos base con precisión 4 para coincidir con DECIMAL(12, 4)
const codeDocument = Joi.string();
const lineNo = Joi.number().integer();
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().precision(4);
const unitMeasure = Joi.string().default('UNIDAD');
const quantityUnitMeasure = Joi.number().precision(4);
const unitPrice = Joi.number().precision(4);
const vat = Joi.number().precision(4).default(21);
const amountLine = Joi.number().precision(4);
const username = Joi.string();

// Parámetros de consulta
const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

// --- ESQUEMAS PARA LÍNEAS DE COMPRA ---

const getPurchInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
});

const createPurchInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
  codeItem: codeItem.optional(), // Opcional para gastos directos sin código de artículo
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure: quantityUnitMeasure.optional().default(1),
  unitPrice: unitPrice.required(),
  vat: vat.optional(),
  amountLine: amountLine.required(),
  username: username.optional(),
});

const updatePurchInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.optional(),
  lineNo: lineNo.required(), // Identificador de línea necesario
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

const queryPurchInvoiceLineSchema = Joi.object({
  limit,
  offset,
  searchTerm: searchTerm.optional(),
});

module.exports = {
  getPurchInvoiceLineSchema,
  createPurchInvoiceLineSchema,
  updatePurchInvoiceLineSchema,
  queryPurchInvoiceLineSchema
};
