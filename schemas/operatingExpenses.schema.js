const Joi = require('joi');

const id = Joi.number().integer();
const date = Joi.date().iso();
const category = Joi.string().valid(
  'Personal y Nóminas',
  'Suministros Públicos',
  'Vehículos y Movilidad',
  'Alquileres e Inmuebles',
  'Herramientas de Empresa',
  'Gastos de Oficina y Administración'
);
const entityCode = Joi.string().min(2).max(100);
const name = Joi.string().min(3).max(100);
const nif = Joi.string().min(5).max(20);
const concept = Joi.string().min(3).max(255);
const baseAmount = Joi.number().precision(2);
const taxAmount = Joi.number().precision(2);
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

const createOperatingExpenseSchema = Joi.object({
  date: date.required(),
  category: category.required(),
  entityCode: entityCode.required(),
  name: name.required(),
  nif: nif.required(),
  concept: concept.required(),
  baseAmount: baseAmount.required(),
  taxAmount: taxAmount.required(),
  totalAmount: totalAmount.required(),
  paymentMethod: paymentMethod.default('Transferencia'),
});

const updateOperatingExpenseSchema = Joi.object({
  date: date.optional(),
  category: category.optional(),
  entityCode: entityCode.optional(),
  name: name.optional(),
  nif: nif.optional().allow(''),
  concept: concept.optional(),
  baseAmount: baseAmount.optional(),
  taxAmount: taxAmount.optional(),
  totalAmount: totalAmount.optional(),
  paymentMethod: paymentMethod.optional(),
});

module.exports = {
  getOperatingExpenseSchema,
  createOperatingExpenseSchema,
  updateOperatingExpenseSchema,
  queryOperatingExpenseSchema // <--- Esto era lo que faltaba
};
