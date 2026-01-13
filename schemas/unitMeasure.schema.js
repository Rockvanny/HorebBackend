const Joi = require('joi');

const code = Joi.string().min(1).max(50);
const description = Joi.string().min(1).max(255);

const limit = Joi.number().integer();
const offset = Joi.number().integer();

const getUnitMeasureSchema = Joi.object({
  code: code.required(),
});

const createUnitMeasureSchema = Joi.object({
  code: code.required(),
  description: description.required(),
});

const updateUnitMeasureSchema = Joi.object({
  description,
});

const queryUnitMeasureSchema = Joi.object({
  limit,
  offset,
});

module.exports = { createUnitMeasureSchema, updateUnitMeasureSchema, getUnitMeasureSchema, queryUnitMeasureSchema };
