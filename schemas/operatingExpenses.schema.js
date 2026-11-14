const Joi = require('joi');

const id = Joi.number().integer();
const date = Joi.date().iso();
// Nombre de una categoría de gasto (tabla editable expense_categories):
// que exista lo garantiza la clave foránea. Ver expenseCategory.schema.js.
const { categoryName: category } = require('./expenseCategory.schema');
const entityType = Joi.string().valid('vendor', 'employee');
const entityCode = Joi.string().min(2).max(100);
const name = Joi.string().min(3).max(100);
const nif = Joi.string().min(5).max(20);
const concept = Joi.string().min(3).max(255);
const baseAmount = Joi.number().precision(2);
const tax = Joi.number().precision(2);
const taxAmount = Joi.number().precision(2);
const irpf = Joi.number().precision(2);
const amountIrpf = Joi.number().precision(2);
const totalAmount = Joi.number().precision(2);
const paymentMethod = Joi.string().valid('Transferencia', 'Efectivo', 'Tarjeta', 'Bizum');

// Esquema de paginación y búsqueda
const queryOperatingExpenseSchema = Joi.object({
  limit: Joi.number().integer().optional(),
  offset: Joi.number().integer().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  category: category.optional(),
  searchTerm: Joi.string().min(1).optional()
});

const getOperatingExpenseSchema = Joi.object({
  id: id.required(),
});

// Corregir un gasto cerrado: el motivo queda en el gasto de ajuste
const correctOperatingExpenseSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(300).required()
    .messages({ 'string.min': 'Explica el motivo de la corrección (mínimo 5 caracteres).', 'any.required': 'Indica el motivo de la corrección.' }),
});

const createOperatingExpenseSchema = Joi.object({
  date: date.required(),
  category: category.required(),
  entityType: entityType.default('vendor'),
  entityCode: entityCode.required(),
  name: name.required(),
  nif: nif.required(),
  concept: concept.required(),
  baseAmount: baseAmount.required(),
  tax: tax.optional(),
  taxAmount: taxAmount.optional(),
  irpf: irpf.optional(),
  amountIrpf: amountIrpf.optional(),
  totalAmount: totalAmount.optional(),
  paymentMethod: paymentMethod.default('Transferencia'),
});

const updateOperatingExpenseSchema = Joi.object({
  date: date.optional(),
  category: category.optional(),
  entityType: entityType.optional(),
  entityCode: entityCode.optional(),
  name: name.optional(),
  nif: nif.optional().allow(''),
  concept: concept.optional(),
  baseAmount: baseAmount.optional(),
  tax: tax.optional(),
  taxAmount: taxAmount.optional(),
  irpf: irpf.optional(),
  amountIrpf: amountIrpf.optional(),
  totalAmount: totalAmount.optional(),
  paymentMethod: paymentMethod.optional(),
});

module.exports = {
  getOperatingExpenseSchema,
  correctOperatingExpenseSchema,
  createOperatingExpenseSchema,
  updateOperatingExpenseSchema,
  queryOperatingExpenseSchema
};
