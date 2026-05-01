const Joi = require('joi');

// ===============================================
// 1. DEFINICIÓN DE ATRIBUTOS INDIVIDUALES
// ===============================================
const code = Joi.string();
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
const paymentMethod = Joi.string().valid(
  'Transferencia',
  'Efectivo',
  'Tarjeta',
  'Bizum'
);
const status = Joi.string();
const amountWithoutVAT = Joi.number().precision(2);
const amountVAT = Joi.number().precision(2);
const amountWithVAT = Joi.number().precision(2);
const username = Joi.string();

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

// ===============================================
// 2. ESQUEMAS DE VALIDACIÓN
// ===============================================

// Obtener una factura registrada por código
const getPurchPostInvoiceSchema = Joi.object({
  code: code.required(),
});

// Crear registro en histórico (al contabilizar)
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
  paymentMethod: paymentMethod.default('Transferencia'),
  status: status.optional(),
  category: category.required(), // Requerido para que la "dona" siempre sume correctamente
  amountWithoutVAT: amountWithoutVAT.optional(),
  amountVAT: amountVAT.optional(),
  amountWithVAT: amountWithVAT.optional(),
  username: username.optional(),
});

// Consulta de históricos (Paginación)
const queryPurchPostInvoiceSchema = Joi.object({
  limit,
  offset
});

module.exports = {
  getPurchPostInvoiceSchema,
  createPurchPostInvoiceSchema,
  queryPurchPostInvoiceSchema
};
