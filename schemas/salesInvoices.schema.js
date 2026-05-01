const Joi = require('joi');
const { createSalesInvoiceLineSchema, updateSalesInvoiceLineSchema } = require('./salesInvoiceLine.schema');


const movementId = Joi.string().uuid();
const id = Joi.number().integer();
const code = Joi.string();
const seriesCode = Joi.string();
const selectedSerie = Joi.string();
const codePosting = Joi.string().allow('', null);
const typeInvoice = Joi.string().valid('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5').default('F1');
const parentCode = Joi.string().allow('', null);
const rectificationType = Joi.string().valid('S', 'I').allow(null);
const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const budgetCode = Joi.string().allow('', null);
const entityCode = Joi.string();
const name = Joi.string().min(3).max(100);
const nif = Joi.string().min(5).max(20);
const email = Joi.string().email().allow('', null);
const phone = Joi.string().allow('', null);
const address = Joi.string().allow('', null);
const postCode = Joi.string().allow('', null);
const city = Joi.string().allow('', null);
const paymentMethod = Joi.string().valid(
  'Transferencia',
  'Efectivo',
  'Tarjeta',
  'Bizum'
);
const status = Joi.string().valid('Abierto', 'Pagado').default('Abierto');
const comments = Joi.string().allow('', null);
const money = Joi.number().precision(4).default(0);
const username = Joi.string();

const getSalesInvoiceSchema = Joi.object({
  code: code.required(),
});

const createSalesInvoiceSchema = Joi.object({
  movementId: movementId.optional(), // <-- Permitir UUID opcional
  code: code.optional(),
  seriesCode: seriesCode.optional(),
  selectedSerie: selectedSerie.optional(),
  codePosting: codePosting.optional(),
  typeInvoice: typeInvoice.optional(),
  parentCode: parentCode.optional(),
  rectificationType: rectificationType.optional(),
  budgetCode: budgetCode.optional(),
  postingDate: postingDate.default(() => new Date()),
  dueDate: dueDate.optional(),
  entityCode: entityCode.required(),
  name: name.required(),
  nif: nif.required(),
  email: email.optional(),
  phone: phone.optional(),
  address: address.optional(),
  postCode: postCode.optional(),
  city: city.optional(),
  paymentMethod: paymentMethod.optional(),
  status: status.optional(),
  paymentMethod: paymentMethod.default('Transferencia'),
  comments: comments.optional(),
  amountWithoutVAT: money.optional(),
  amountVAT: money.optional(),
  amountWithVAT: money.optional(),
  username: username.optional(),
  lines: Joi.array().items(createSalesInvoiceLineSchema).optional(),
});

const updateSalesInvoiceSchema = Joi.object({
  id: id.optional(),
  movementId: movementId.optional(), // <-- Permitir UUID opcional
  seriesCode: seriesCode.optional(),
  codePosting: codePosting.optional(),
  typeInvoice: typeInvoice.optional(),
  parentCode: parentCode.optional(),
  rectificationType: rectificationType.optional(),
  budgetCode: budgetCode.optional(),
  postingDate: postingDate.optional(),
  dueDate: dueDate.optional(),
  entityCode: entityCode.optional(),
  name: name.optional(),
  nif: nif.optional().allow(''),
  email: email.optional(),
  phone: phone.optional(),
  address: address.optional(),
  postCode: postCode.optional(),
  city: city.optional(),
  paymentMethod: paymentMethod.optional(),
  status: status.optional(),
  paymentMethod: paymentMethod.optional(),
  comments: comments.optional(),
  amountWithoutVAT: money.optional(),
  amountVAT: money.optional(),
  amountWithVAT: money.optional(),
  username: username.optional(),
  lines: Joi.array().items(updateSalesInvoiceLineSchema).optional(),
});

module.exports = {
  getSalesInvoiceSchema,
  createSalesInvoiceSchema,
  updateSalesInvoiceSchema
};
