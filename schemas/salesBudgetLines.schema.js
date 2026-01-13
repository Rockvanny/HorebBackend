const Joi = require('joi');

const codeBudget = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string();
const description = Joi.string().allow('', null);
const quantity = Joi.number().integer().min(0);
const unitMeasure = Joi.string();
const quantityUnitMeasure = Joi.number().integer().min(0);
const unitPrice = Joi.number().precision(2).min(0);
const vat = Joi.number().precision(2).min(0).max(100); // IVA como porcentaje
const amountLine = Joi.number().precision(2).min(0);
const username = Joi.string().allow('', null);

const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

const getSalesBudgetLineSchema = Joi.object({
  codeBudget: codeBudget.required(),
  lineNo: lineNo.required(),
});

const createSalesBudgetLineSchema = Joi.object({
  codeBudget: codeBudget.required(),
  lineNo: lineNo.required(),
  codeItem: codeItem.required(),
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.required(),
  quantityUnitMeasure: quantityUnitMeasure.required(),
  unitPrice: unitPrice.required(),
  vat: vat.required(),
  amountLine: amountLine.required(),
  username: username.optional(),
});

const updateSalesBudgetLineSchema = Joi.object({
  codeBudget: codeBudget.required(),
  lineNo: lineNo.required(),
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

const querySalesBudgetLineSchema = Joi.object({
  limit,
  offset,
  searchTerm: searchTerm.optional(),
});

module.exports = { getSalesBudgetLineSchema, createSalesBudgetLineSchema, updateSalesBudgetLineSchema, querySalesBudgetLineSchema };
