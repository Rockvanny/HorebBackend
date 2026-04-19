const Joi = require('joi');

const code = Joi.string();
const name = Joi.string().min(3).max(200);
const unitMeasure = Joi.string().valid('Unidad', 'Caja', 'Kilos', 'Metros', 'Horas').default('Unidad');
const qtyByUnitMeasure = Joi.number().precision(2);
const price = Joi.number().precision(2);
const vat = Joi.number().integer();
const username = Joi.string();
const selectedSerie = Joi.string(); // <--- CRÍTICO para el Hook

const limit = Joi.number().integer();
const offset = Joi.number().integer();

const getProductSchema = Joi.object({
  code: code.required(),
});

const createProductSchema = Joi.object({
  name: name.required(),
  unitMeasure: unitMeasure.required(),
  qtyByUnitMeasure: qtyByUnitMeasure.required(),
  price: price.required(),
  vat: vat.required(),
  selectedSerie: selectedSerie.required(), // <--- Requerido para generar el code
  username, // Opcional, lo solemos inyectar en el service
});

const updateProductSchema = Joi.object({
  name: name,
  unitMeasure: unitMeasure,
  qtyByUnitMeasure: qtyByUnitMeasure,
  price: price,
  vat: vat,
  username,
}).min(1); // Al menos un campo debe ser enviado para actualizar

const queryProductSchema = Joi.object({
  limit,
  offset,
});

module.exports = { createProductSchema, updateProductSchema, getProductSchema, queryProductSchema }
