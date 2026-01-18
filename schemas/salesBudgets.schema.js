const Joi = require('joi');
const { updateSalesBudgetLineSchema } = require('./salesBudgetLines.schema');

const code = Joi.string();
const postingDate = Joi.date();
const dueDate = Joi.date();
const customerCode = Joi.string();
const name = Joi.string().min(3).max(50);
const nif = Joi.string().min(9).max(15);
const email = Joi.string().email();
const phone = Joi.string();
const address = Joi.string();
const postCode = Joi.string();
const city = Joi.string();
const status = Joi.string();
const amountWithoutVAT = Joi.number().precision(2);
const amountVAT = Joi.number().precision(2);
const amountWithVAT = Joi.number().precision(2);
const username = Joi.string();

const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

const getSalesBudgetSchema = Joi.object({
  code: code.required(),
});

const createSalesBudgetSchema = Joi.object({
  code: code.required(),
  postingDate: postingDate.required(),
  dueDate: dueDate.required(),
  customerCode: customerCode.required(),
  name: name.required(),
  nif: nif.required(),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  status: status.optional(),
  amountWithoutVAT: amountWithoutVAT.optional(),
  amountVAT: amountVAT.optional(),
  amountWithVAT: amountWithVAT.optional(),
  username: username.optional(),
});

const updateSalesBudgetSchema = Joi.object({
  code: code.required(),
  dueDate: dueDate.required(),
  customerCode: customerCode.required(),
  name: name.required(),
  nif: nif.optional().allow(''),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  status: status.optional(),
  amountWithoutVAT: amountWithoutVAT.optional(),
  amountVAT: amountVAT.optional(),
  amountWithVAT: amountWithVAT.optional(),
  username: username.optional(),

  lines: Joi.array().items(updateSalesBudgetLineSchema).optional(),
});

const querySalesBudgetSchema = Joi.object({
  limit,
  offset,
  searchTerm: searchTerm.optional(),
});

module.exports = { getSalesBudgetSchema, createSalesBudgetSchema, updateSalesBudgetSchema, querySalesBudgetSchema };
