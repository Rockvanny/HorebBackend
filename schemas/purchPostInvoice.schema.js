const Joi = require('joi');

// ===============================================
// 1. DEFINICIÓN DE ATRIBUTOS INDIVIDUALES
// ===============================================
const id = Joi.number().integer();
const movementId = Joi.string().uuid();
const code = Joi.string();
const seriesCode = Joi.string().allow('', null);
const preInvoice = Joi.string();
const typeInvoice = Joi.string().valid('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5');
const parentCode = Joi.string().allow('', null);
const rectificationType = Joi.string().valid('S', 'I').allow(null);

const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const budgetCode = Joi.string().allow('', null);
const vendorCode = Joi.string();
const name = Joi.string().min(3);
const nif = Joi.string(); // Añadido para simetría y fiscalidad
const email = Joi.string().email().allow('', null);
const phone = Joi.string().allow('', null);
const address = Joi.string();
const postCode = Joi.string().allow('', null);
const city = Joi.string().allow('', null);

const paymentMethod = Joi.string().valid(
  'Transferencia',
  'Efectivo',
  'Tarjeta',
  'Bizum'
);

const status = Joi.string().valid('Abierto', 'Pagado');
const category = Joi.string().valid(
  'Materiales',
  'Subcontratas',
  'Personal y Nóminas',
  'Herramientas y Alquileres',
  'Vehículos y Movilidad',
  'Gastos de Oficina y Varios'
);

const amountWithoutVAT = Joi.number().precision(4);
const amountVAT = Joi.number().precision(4);
const amountWithVAT = Joi.number().precision(4);
const userName = Joi.string(); // Corregido camelCase

const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

// ===============================================
// 2. ESQUEMAS DE VALIDACIÓN
// ===============================================

// Obtener una factura registrada por ID numérico (Efecto Espejo)
const getPurchPostInvoiceSchema = Joi.object({
  id: id.required(),
});

// Crear registro en histórico (al contabilizar)
const createPurchPostInvoiceSchema = Joi.object({
  movementId: movementId.required(),
  code: code.required(),
  seriesCode: seriesCode.optional(),
  preInvoice: preInvoice.required(),
  typeInvoice: typeInvoice.default('F1'),
  parentCode: parentCode.optional(),
  rectificationType: rectificationType.optional(),

  postingDate: postingDate.required(),
  dueDate: dueDate.optional(),
  budgetCode: budgetCode.optional(),
  vendorCode: vendorCode.required(),
  name: name.required(),
  nif: nif.required(),

  email: email.optional(),
  phone: phone.optional(),
  address: address.required(),
  postCode: postCode.optional(),
  city: city.optional(),

  paymentMethod: paymentMethod.default('Transferencia'),
  status: status.default('Abierto'),
  category: category.required(),

  amountWithoutVAT: amountWithoutVAT.required(),
  amountVAT: amountVAT.required(),
  amountWithVAT: amountWithVAT.required(),
  userName: userName.optional(),
});

// Consulta de históricos (Paginación y búsqueda)
const queryPurchPostInvoiceSchema = Joi.object({
  limit,
  offset,
  searchTerm
});

module.exports = {
  getPurchPostInvoiceSchema,
  createPurchPostInvoiceSchema,
  queryPurchPostInvoiceSchema
};
