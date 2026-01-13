const Joi = require('joi');

const code = Joi.string();
const name = Joi.string().min(3).max(50);
const nif = Joi.string().min(9).max(15);
const email = Joi.string().email();
const phone =  Joi.string();
const address = Joi.string();
const postCode = Joi.string();
const city =  Joi.string();
const username = Joi.string();

const limit = Joi.number().integer();
const offset = Joi.number().integer();

const getCustomerSchema = Joi.object({
  code: code.required(),
});

const createCustomerSchema = Joi.object({
  code: code.required(),
  name: name.required(),
  nif: nif.required(),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  username,
});

const updateCustomerSchema = Joi.object({
  name: name.required(),
  nif: nif.optional().allow(''),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  username,
});

const queryCustomerSchema = Joi.object({
  limit,
  offset
});

module.exports = { getCustomerSchema, createCustomerSchema, updateCustomerSchema, queryCustomerSchema };
