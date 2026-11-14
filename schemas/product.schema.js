const Joi = require('joi');
const { taxCode, withholdingType, withholdingPercentage } = require('./taxRate.schema');

const code = Joi.string();
const name = Joi.string().min(3).max(200);
const unitMeasure = Joi.string()
  .valid('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK', 'ML')
  .default('UNIDAD');
const qtyByUnitMeasure = Joi.number().precision(2);
const price = Joi.number().precision(2);
// Código de impuesto del catálogo editable (ver taxRate.schema.js)
const taxType = taxCode.default('IVA');
const vat = Joi.number().min(0).max(100).precision(2);
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
  taxType: taxType.optional(),
  vat: vat.required(),
  withholdingType,
  withholdingPercentage,
  selectedSerie: selectedSerie.required(), // <--- Requerido para generar el code
  username, // Opcional, lo solemos inyectar en el service
});

const updateProductSchema = Joi.object({
  name: name,
  unitMeasure: unitMeasure,
  qtyByUnitMeasure: qtyByUnitMeasure,
  price: price,
  taxType: taxType.optional(),
  vat: vat,
  withholdingType,
  withholdingPercentage,
  username,
}).min(1); // Al menos un campo debe ser enviado para actualizar

const queryProductSchema = Joi.object({
  limit,
  offset,
});

module.exports = { createProductSchema, updateProductSchema, getProductSchema, queryProductSchema }
