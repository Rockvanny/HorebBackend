const Joi = require('joi');

// Definiciones base (Mejoradas con validaciones de rango)
const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().precision(4); // Quitamos min(0) por si hay abonos/devoluciones
const unitMeasure = Joi.string().allow('', null).default('UNIDAD');
const quantityUnitMeasure = Joi.number().precision(4).default(1);
const unitPrice = Joi.number().precision(4);
const vat = Joi.number().min(0).max(100).precision(4).default(21);
const amountLine = Joi.number().precision(4);
const username = Joi.string().allow('', null);

const getSalesInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
});

const createSalesInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.optional().allow('', null), // Opcional para inyección desde el Header
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

const updateSalesInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.optional(),
  lineNo: lineNo.optional(), // Opcional en update para mayor flexibilidad
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

module.exports = {
  getSalesInvoiceLineSchema,
  createSalesInvoiceLineSchema,
  updateSalesInvoiceLineSchema,
  querySalesInvoiceLineSchema: Joi.object({
    limit: Joi.number().integer(),
    offset: Joi.number().integer(),
    searchTerm: Joi.string().allow('').optional()
  })
};
