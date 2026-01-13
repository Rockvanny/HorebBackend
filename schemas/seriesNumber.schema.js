const Joi = require('joi');

const type = Joi.string().min(3).max(25); // Ajuste aquí
const startSerie = Joi.string().alphanum().max(20);

const description = Joi.string().min(3).max(50);
const lastSerie = Joi.string().max(20);
const username = Joi.string();

const limit = Joi.number().integer();
const offset = Joi.number().integer();

const createSeriesNumberSchema = Joi.object({
  type: type.required(),
  startSerie: startSerie.required(),
  description: description.required(),
});

const updateSeriesNumberSchema = Joi.object({
  description: description.required(),
  lastSerie: lastSerie.required()
});

const getSeriesNumberSchema = Joi.object({
  type: type.required(),
  startSerie: startSerie.required()
});

const getSeriesByTypeSchema = Joi.object({
  type: Joi.string().min(3).max(50).required(),
});

const querySeriesNumberSchema = Joi.object({
  type: Joi.string().optional(),
  startSerie: Joi.string().optional().messages({
    'any.required': 'El parámetro "startSerie" es obligatorio para esta consulta.',
    'string.empty': 'El parámetro "startSerie" no puede estar vacío.'
  }),
  limit,
  offset,
});

module.exports = { createSeriesNumberSchema, updateSeriesNumberSchema, getSeriesNumberSchema, getSeriesByTypeSchema, querySeriesNumberSchema };
