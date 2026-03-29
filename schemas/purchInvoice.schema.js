const Joi = require('joi');
const { updatePurchInvoiceLineSchema } = require('./purchInvoiceLine.schema');

// ===============================================
// 1. DEFINICIÓN DE ATRIBUTOS INDIVIDUALES
// ===============================================
const code = Joi.string();
const codePosting = Joi.string();
const postingDate = Joi.date();
const dueDate = Joi.date();
const budgetCode = Joi.string();
const vendorCode = Joi.string();
const name = Joi.string().min(3).max(30);
const email = Joi.string().email();
const phone = Joi.string();
const address = Joi.string();
const postCode = Joi.string();
const city = Joi.string();
const paymentMethod = Joi.string();
const status = Joi.string();
const amountWithoutVAT = Joi.number().precision(2);
const amountVAT = Joi.number().precision(2);
const amountWithVAT = Joi.number().precision(2);
const username = Joi.string();

/**
 * AJUSTE: Categorías globales para empresa de reformas.
 * Se utiliza .valid() para restringir los valores a la lista acordada.
 */
const category = Joi.string().valid(
  'Materiales',
  'Subcontratas',
  'Personal y Nóminas',
  'Herramientas y Alquileres',
  'Vehículos y Movilidad',
  'Gastos de Oficina y Varios'
);

const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

// ===============================================
// 2. ESQUEMAS DE VALIDACIÓN
// ===============================================

// Obtener una factura por código
const getPurchInvoiceSchema = Joi.object({
  code: code.required(),
});

// Crear una nueva factura (Categoría obligatoria)
const createPurchInvoiceSchema = Joi.object({
  code: code.required(),
  codePosting: codePosting.required(),
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
  status: status.optional(),
  category: category.required(), // Forzamos la categorización en la entrada
  amountWithoutVAT: amountWithoutVAT.optional(),
  amountVAT: amountVAT.optional(),
  amountWithVAT: amountWithVAT.optional(),
  username: username.optional(),
});

// Actualizar una factura existente
const updatePurchInvoiceSchema = Joi.object({
  code: code.required(),
  codePosting: codePosting.required(),
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
  status: status.optional(),
  category: category.optional(), // Opcional en la edición
  amountWithoutVAT: amountWithoutVAT.optional(),
  amountVAT: amountVAT.optional(),
  amountWithVAT: amountWithVAT.optional(),
  username: username.optional(),

  lines: Joi.array().items(updatePurchInvoiceLineSchema).optional(),
});

// Esquema para consultas de lista (Paginación y búsqueda)
const queryPurchInvoiceSchema = Joi.object({
  limit,
  offset,
  searchTerm: searchTerm.optional(),
});

module.exports = {
  getPurchInvoiceSchema,
  createPurchInvoiceSchema,
  updatePurchInvoiceSchema,
  queryPurchInvoiceSchema
};
