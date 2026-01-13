const Joi = require('joi');

const code = Joi.string();
const postingDate = Joi.date();
const dueDate = Joi.date();
const budgetCode = Joi.string();
const vendorCode = Joi.string();
const name = Joi.string().min(3).max(30);
const email = Joi.string().email();
const phone =  Joi.string();
const address = Joi.string();
const postCode = Joi.string();
const city =  Joi.string();
const paymentMethod = Joi.string();
const status = Joi.string();
const amountWithoutVAT = Joi.number().precision(2);
const amountVAT = Joi.number().precision(2);
const amountWithVAT = Joi.number().precision(2);
const username = Joi.string();

const limit = Joi.number().integer();
const offset = Joi.number().integer();

const getPurchPostInvoiceSchema = Joi.object({
  code: code.required(),
});

const createPurchPostInvoiceSchema = Joi.object({
  code: code.required(),
  postingDate: postingDate.required(),
  dueDate: dueDate.required(),
  budgetCode: budgetCode.optional(),
  vendorCode: vendorCode.required(),
  name: name.required(),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  paymentMethod: paymentMethod.required(),
  status,
  amountWithoutVAT,
  amountVAT,
  amountWithVAT,
  username,
});

const queryPurchPostInvoiceSchema = Joi.object({
  limit,
  offset
});

module.exports = { getPurchPostInvoiceSchema, createPurchPostInvoiceSchema, queryPurchPostInvoiceSchema };
