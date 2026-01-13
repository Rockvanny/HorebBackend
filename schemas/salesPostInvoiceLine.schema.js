const Joi = require('joi');

const codeInvoice = Joi.string();
const lineNo = Joi.number();
const codeItem = Joi.string();
const description = Joi.string();
const quantity = Joi.number();
const unitMeasure = Joi.string();
const quantityUnitMeasure = Joi.number();
const unitPrice = Joi.number().precision(2);
const vat = Joi.number();
const amountLine = Joi.number().precision(2);
const username = Joi.string();

const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

const getSalesPostInvoiceLineSchema = Joi.object({
  codeInvoice: codeInvoice.required(),
  lineNo: lineNo.required(),
});

const createSalesPostInvoiceLineSchema = Joi.object({
  codeInvoice: codeInvoice.required(),
  lineNo: lineNo.required(),
  codeItem: codeItem.required(),
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.required(),
  quantityUnitMeasure: quantityUnitMeasure.required(),
  unitPrice: unitPrice.required(),
  vat: vat.required(),
  amountLine: amountLine.required(),
  username,
});

const updateSalesPostInvoiceLineSchema = Joi.object({
  codeInvoice: codeInvoice.required(),
  lineNo: lineNo.required(),
  codeItem: codeItem.required(),
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.required(),
  quantityUnitMeasure: quantityUnitMeasure.required(),
  unitPrice: unitPrice.required(),
  vat: vat.required(),
  amountLine: amountLine.required(),
  username,
});

const querySalesPostInvoiceLineSchema = Joi.object({
  limit,
  offset,
  searchTerm: searchTerm.optional(),
});

module.exports = { getSalesPostInvoiceLineSchema, createSalesPostInvoiceLineSchema, updateSalesPostInvoiceLineSchema, querySalesPostInvoiceLineSchema };
