const Joi = require('joi');

const code = Joi.string();
const name = Joi.string().min(3).max(50);
const nif = Joi.string().min(9).max(15);
const email = Joi.string().email();
const phone = Joi.string();
const address = Joi.string();
const postCode = Joi.string();
const city = Joi.string();
const province = Joi.string().allow('', null);
// Nombre de una categoría de gasto (tabla editable expense_categories):
// que exista lo garantiza la clave foránea. Ver expenseCategory.schema.js.
const { categoryName: category } = require('./expenseCategory.schema');
const paymentMethod = Joi.string().valid(
  'Transferencia',
  'Efectivo',
  'Tarjeta',
  'Bizum'
);

const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('', null);

const getVendorSchema = Joi.object({
  code: code.required(),
});

const createVendorSchema = Joi.object({
  selectedSerie: Joi.string().required(), // Ahora permitido y obligatorio para nuevos
  code: code.optional(),
  name: name.required(),
  nif: nif.required(),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  province: province.optional(),
  category: category.required(),
  paymentMethod: paymentMethod.default('Transferencia'),
});

const updateVendorSchema = Joi.object({
  name: name.required(),
  nif: nif.optional().allow(''),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  province: province.optional(),
  category: category.optional(),
  paymentMethod: paymentMethod.optional(),
});

const queryVendorSchema = Joi.object({
  limit,
  offset,
  searchTerm
});

module.exports = { getVendorSchema, createVendorSchema, updateVendorSchema, queryVendorSchema };
