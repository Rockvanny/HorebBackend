const Joi = require('joi');

const type = Joi.string();
const startSerie = Joi.string();
const postingSerie = Joi.string().allow(null, ''); // Nuevo: permite null o vacío
const description = Joi.string().min(3);
const prefix = Joi.string().uppercase();
const lastNumber = Joi.number().integer().min(0);
const digits = Joi.number().integer().min(1).max(10);
const fromDate = Joi.date();
const toDate = Joi.date();
const username = Joi.string();

const limit = Joi.number().integer();
const offset = Joi.number().integer();

const getSeriesNumberSchema = Joi.object({
  type: type.required(),
  startSerie: startSerie.required(),
});

const createSeriesNumberSchema = Joi.object({
  type: type.required(),
  startSerie: startSerie.required(),
  postingSerie: postingSerie.optional(), // Relación opcional con la serie definitiva
  description: description.required(),
  prefix: prefix.required(),
  lastNumber: lastNumber.default(0),
  digits: digits.default(4),
  fromDate: fromDate.required(),
  toDate: toDate.required(),
  username: username.optional()
});

const updateSeriesNumberSchema = Joi.object({
  // Permitimos actualizar la relación si se equivoca al crearla
  postingSerie: postingSerie.optional(),
  description: description.optional(),
  prefix: prefix.optional(),
  lastNumber: lastNumber.optional(),
  digits: digits.optional(),
  fromDate: fromDate.optional(),
  toDate: toDate.optional(),
  username: username.optional()
});

const querySeriesNumberSchema = Joi.object({
  limit,
  offset,
  type: type.optional()
});

module.exports = {
  getSeriesNumberSchema,
  createSeriesNumberSchema,
  updateSeriesNumberSchema,
  querySeriesNumberSchema
};
