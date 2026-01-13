const Joi = require('joi');

const code = Joi.string();
const name = Joi.string().min(3).max(200).required();
const unitMeasure = Joi.string().min(3).max(15);
const qtyByUnitMeasure = Joi.number().precision(2);
const price = Joi.number().precision(2);
const vat = Joi.number().integer();
const username = Joi.string();

const limit = Joi.number().integer();
const offset = Joi.number().integer();

const getProductSchema = Joi.object({
  code: code.required(),
});

const createProductSchema = Joi.object({
  code: code.required(),
  name: name.required(),
  unitMeasure: unitMeasure.required(),
  qtyByUnitMeasure: qtyByUnitMeasure.required(),
  price: price.required(),
  vat: vat.required(),
  username,
});

const updateProductSchema = Joi.object({
  name: name.required(),
  unitMeasure: unitMeasure.required(),
  qtyByUnitMeasure: qtyByUnitMeasure.required(),
  price: price.required(),
  vat: vat.required(),
  username,
});



const queryProductSchema = Joi.object({
  limit,
  offset,
});

module.exports = { createProductSchema, updateProductSchema, getProductSchema, queryProductSchema }
