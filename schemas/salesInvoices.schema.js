const Joi = require('joi');
const { updateSalesInvoiceLineSchema } = require('./salesInvoiceLine.schema');

const code = Joi.string();
const codePosting =Joi.string();
const postingDate = Joi.date();
const dueDate = Joi.date();
const budgetCode = Joi.string();
const customerCode = Joi.string();
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
const searchTerm = Joi.string().allow('');

const getSalesInvoiceSchema = Joi.object({
  code: code.required(),
});

const createSalesInvoiceSchema = Joi.object({
  code: code.required(),
  codePosting: codePosting.required(),
  postingDate: postingDate.required(),
  dueDate: dueDate.required(),
  budgetCode: budgetCode.optional(),
  customerCode: customerCode.required(),
  name: name.required(),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  paymentMethod: paymentMethod.required(),
  status: status.optional(),
  amountWithoutVAT: amountWithoutVAT.optional(),
  amountVAT: amountVAT.optional(),
  amountWithVAT: amountWithVAT.optional(),
  username: username.optional(),
});

const updateSalesInvoiceSchema = Joi.object({
  code: code.required(),
  codePosting: codePosting.required(),
  dueDate: dueDate.required(),
  budgetCode: budgetCode.optional(),
  customerCode: customerCode.required(),
  name: name.required(),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  paymentMethod: paymentMethod.required(),
  status: status.optional(),
  amountWithoutVAT: amountWithoutVAT.optional(),
  amountVAT: amountVAT.optional(),
  amountWithVAT: amountWithVAT.optional(),
  username: username.optional(),

  lines: Joi.array().items(updateSalesInvoiceLineSchema).optional(),
});

const querySalesInvoiceSchema = Joi.object({
  limit,
  offset,
  searchTerm: searchTerm.optional(),
});

module.exports = { getSalesInvoiceSchema, createSalesInvoiceSchema, updateSalesInvoiceSchema, querySalesInvoiceSchema };
