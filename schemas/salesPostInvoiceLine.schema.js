const Joi = require('joi');

const id = Joi.number().integer();
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

const getSalesPostInvoiceLineSchema = Joi.object({
  id: id.optional(), // Búsqueda por ID técnico
  codeDocument: codeDocument.optional(), // O por documento + línea
  lineNo: lineNo.optional(),
}).or('id', 'codeDocument'); // Al menos uno es necesario

const createSalesPostInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
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

const querySalesPostInvoiceLineSchema = Joi.object({
  limit: Joi.number().integer(),
  offset: Joi.number().integer(),
  searchTerm: Joi.string().allow('').optional()
});

module.exports = {
  getSalesPostInvoiceLineSchema,
  createSalesPostInvoiceLineSchema,
  querySalesPostInvoiceLineSchema
};
