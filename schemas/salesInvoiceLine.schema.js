const Joi = require('joi');

// Definición de tipos base con precisión 4 para coincidir con DECIMAL(12, 4)
const codeBudget = Joi.string(); // Cambiado a codeBudget para mantener simetría con el modelo
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

// Consultas
const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

// --- ESQUEMAS ---

const getSalesBudgetLineSchema = Joi.object({
  codeBudget: codeBudget.required(),
  lineNo: lineNo.required(),
});

const createSalesBudgetLineSchema = Joi.object({
  codeBudget: codeBudget.required(),
  lineNo: lineNo.required(),
  codeItem: codeItem.optional(),
  description: description.required(), // La descripción suele ser obligatoria para saber qué se vende
  quantity: quantity.required(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure: quantityUnitMeasure.optional().default(0),
  unitPrice: unitPrice.required(),
  vat: vat.optional(),
  amountLine: amountLine.required(),
  username: username.optional(),
});

const updateSalesBudgetLineSchema = Joi.object({
  codeBudget: codeBudget.optional(),
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

module.exports = {
  getSalesBudgetLineSchema,
  createSalesBudgetLineSchema,
  updateSalesBudgetLineSchema,
  querySalesBudgetLineSchema
};
