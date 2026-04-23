const Joi = require('joi');

/**
 * Nota: El campo 'type' en Joi sigue siendo String porque es lo que
 * recibimos del cliente (API/Frontend). El Servicio lo mapeará al
 * INTEGER correspondiente (1, 2, 3...) definido en el Modelo.
 */

const type = Joi.alternatives().try(
  Joi.string().valid(
    'customer',
    'vendor',
    'product',
    'budget',
    'salesinvoice',
    'purchinvoice'
  ), // Para aceptar 'customer'
  Joi.number(), // Para aceptar 2
  Joi.string().pattern(/^\d+$/) // Para aceptar "2" (string numérico)
);

const code = Joi.string().min(1).max(20).uppercase(); // Quitamos alphanum por si usan guiones como 'FV-26'
const lastValue = Joi.string().min(1).max(30);
const postingSerie = Joi.string().allow(null, '');
const description = Joi.string().min(3).max(100);
const fromDate = Joi.date().iso();
const toDate = Joi.date().iso().greater(Joi.ref('fromDate'));
const username = Joi.string();

// Parámetros de paginación y filtro
const limit = Joi.number().integer().min(1);
const offset = Joi.number().integer().min(0);
const searchTerm = Joi.string().allow('', null);

const getSeriesNumberSchema = Joi.object({
  type: type.required(),
  code: code.required(),
});

const createSeriesNumberSchema = Joi.object({
  type: type.required(),
  code: code.required(),
  postingSerie: postingSerie.optional(),
  description: description.required(),
  fromDate: fromDate.required(),
  toDate: toDate.required(),
  username: username.optional()
});

const updateSeriesNumberSchema = Joi.object({
  // Recordatorio: type y code no se editan por ser Primary Keys
  postingSerie: postingSerie.optional(),
  description: description.optional(),
  fromDate: fromDate.optional(),
  toDate: toDate.optional(),
  username: username.optional()
});

const querySeriesNumberSchema = Joi.object({
  limit,
  offset,
  type: type.optional(), // Permite filtrar por tipo (ej: ver solo facturas)
  searchTerm: searchTerm.optional()
});

module.exports = {
  getSeriesNumberSchema,
  createSeriesNumberSchema,
  updateSeriesNumberSchema,
  querySeriesNumberSchema
};
