const Joi = require('joi');

const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().min(0).precision(4);
const quantityUnitMeasure = Joi.number().min(0).precision(4).default(1);
const unitPrice = Joi.number().min(0).precision(4);

const taxType = Joi.string()
  .valid('IVA', 'IRPF', 'RE', 'EXENTO')
  .default('IVA');

const unitMeasure = Joi.string()
  .valid('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK')
  .default('UNIDAD');

const vat = Joi.number().min(0).max(100).precision(4).default(21);
const amountLine = Joi.number().min(0).precision(4);
const username = Joi.string().allow('', null);

const getSalesBudgetLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
});

const createSalesBudgetLineSchema = Joi.object({
  codeDocument: codeDocument.optional().allow('', null),
  lineNo: lineNo.required(),
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure: quantityUnitMeasure.optional(),
  unitPrice: unitPrice.required(),
  taxType: taxType.optional(), // <-- Agregado
  vat: vat.optional(),
  amountLine: amountLine.required(),
  username: username.optional(),
});

const updateSalesBudgetLineSchema = Joi.object({
  codeDocument: codeDocument.optional(),
  lineNo: lineNo.optional(),
  codeItem: codeItem.optional(),
  description: description.optional(),
  quantity: quantity.optional(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure: quantityUnitMeasure.optional(),
  unitPrice: unitPrice.optional(),
  taxType: taxType.optional(), // <-- Agregado
  vat: vat.optional(),
  amountLine: amountLine.optional(),
  username: username.optional(),
});

const querySalesBudgetLineSchema = Joi.object({
  limit: Joi.number().integer(),
  offset: Joi.number().integer(),
  searchTerm: Joi.string().allow('').optional(),
});

module.exports = {
  getSalesBudgetLineSchema,
  createSalesBudgetLineSchema,
  updateSalesBudgetLineSchema,
  querySalesBudgetLineSchema
};
