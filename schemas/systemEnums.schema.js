const Joi = require('joi');

// Definición de tipos base
const id = Joi.number().integer();
const model = Joi.string().min(3).max(50);
const field = Joi.string().min(3).max(50);
const code = Joi.string().min(1).max(50);
const description = Joi.string().min(1).max(255);
const sortOrder = Joi.number().integer();
const isActive = Joi.boolean();

// --- Esquema para Creación ---
const createSystemEnumSchema = Joi.object({
  model: model.required(),
  field: field.required(),
  code: code.required(),
  description: description.required(),
  sortOrder: sortOrder.default(0),
  isActive: isActive.default(true)
});

// --- Esquema para Actualización ---
const updateSystemEnumSchema = Joi.object({
  model: model,
  field: field,
  code: code,
  description: description,
  sortOrder: sortOrder,
  isActive: isActive
});

// --- Esquema para Obtener por ID ---
const getSystemEnumSchema = Joi.object({
  id: id.required(),
});

// --- Esquema para Filtrar Enums (Útil para el Controller de búsqueda) ---
const querySystemEnumSchema = Joi.object({
  model: model.required(),
  field: field.required(),
});

module.exports = {
  createSystemEnumSchema,
  updateSystemEnumSchema,
  getSystemEnumSchema,
  querySystemEnumSchema
};
