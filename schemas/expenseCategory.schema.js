const Joi = require('joi');

/**
 * Nombre de una categoría de gasto (ver db/models/expenseCategory.model.js).
 * Lo comparten los esquemas de proveedores, gastos operativos y facturas de
 * compra: que exista lo garantiza la clave foránea de la base de datos.
 * Sin < ni >: el nombre se pinta tal cual en listas y desplegables.
 */
const categoryName = Joi.string().trim().min(2).max(80).pattern(/^[^<>]*$/)
  .messages({ 'string.pattern.base': 'El nombre no puede contener < ni >.' });

const id = Joi.number().integer().positive();
const isGeneralExpense = Joi.boolean();
const active = Joi.boolean();
const sortOrder = Joi.number().integer().min(0).max(99999);

const createExpenseCategorySchema = Joi.object({
  name: categoryName.required(),
  isGeneralExpense,
  active,
  sortOrder
});

const updateExpenseCategorySchema = Joi.object({
  name: categoryName,
  isGeneralExpense,
  active,
  sortOrder
});

const getExpenseCategorySchema = Joi.object({
  id: id.required()
});

const expenseCategoryOptionsSchema = Joi.object({
  generalExpense: Joi.boolean()
});

module.exports = {
  categoryName,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  getExpenseCategorySchema,
  expenseCategoryOptionsSchema
};
