// schemas/purchPostInvoice.schema.js
const Joi = require('joi');
// Importamos el validador de líneas de compra que acabamos de crear
const { createPurchPostInvoiceLineSchema } = require('./purchPostInvoiceLine.schema');

// ===============================================
// 1. DEFINICIÓN DE ATRIBUTOS INDIVIDUALES
// ===============================================
const id = Joi.number().integer();
const movementId = Joi.string().uuid();
const code = Joi.string();
const seriesCode = Joi.string();
const preInvoice = Joi.string();
const typeInvoice = Joi.string().valid('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5').default('F1');
const parentCode = Joi.string().allow('', null);
const rectificationType = Joi.string().valid('S', 'I').allow(null);

const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const budgetCode = Joi.string().allow('', null);
const entityCode = Joi.string(); // Equivalente a entityCode en ventas
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
const category = Joi.string().valid(
  'Suministros de Obra',
  'Logística de Materiales',
  'Material de Construcción',
  'Equipamiento / Maquinaria',
  'Servicios Externos de Obra'
);

const money = Joi.number().precision(4).default(0);
const userName = Joi.string();

// ===============================================
// 2. ESQUEMAS DE VALIDACIÓN
// ===============================================

// CORREGIDO: Buscamos por "code" igual que en ventas registradas
const getPurchPostInvoiceSchema = Joi.object({
  code: code.required()
});

// Crear registro en histórico (al contabilizar con sus líneas)
const createPurchPostInvoiceSchema = Joi.object({
  movementId: movementId.required(), // Obligatorio para heredar la trazabilidad
  code: code.required(),
  seriesCode: seriesCode.optional(),
  preInvoice: preInvoice.required(),
  typeInvoice: typeInvoice.required(),
  parentCode: parentCode.optional(),
  rectificationType: rectificationType.optional(),
  budgetCode: budgetCode.optional(),
  postingDate: postingDate.required(),
  dueDate: dueDate.optional(),
  entityCode: entityCode.required(),
  name: name.required(),
  nif: nif.required(),
  email: email.optional(),
  phone: phone.optional(),
  address: address.required(),
  postCode: postCode.optional(),
  city: city.optional(),
  paymentMethod: paymentMethod.default('Transferencia'),
  status: status.optional(),
  category: category.required(), // Campo exclusivo pero obligatorio en compras
  amountWithoutVAT: money.required(),
  amountVAT: money.required(),
  amountWithVAT: money.required(),
  userName: userName.optional(),
  // NUEVO: Array de líneas obligatorio (mínimo 1 línea) igual que ventas
  lines: Joi.array().items(createPurchPostInvoiceLineSchema).min(1).required(),
});

// NUEVO: Añadido Update por simetría estructural (para actualizar estados o comentarios)
const updatePurchPostInvoiceSchema = Joi.object({
  id: id.optional(),
  status: status.optional(),
  dueDate: dueDate.optional(),
  comments: Joi.string().allow('', null).optional(),
  paymentMethod: paymentMethod.optional(),
});

// Consulta de históricos (Paginación y búsqueda)
const queryPurchPostInvoiceSchema = Joi.object({
  limit: Joi.number().integer(),
  offset: Joi.number().integer(),
  searchTerm: Joi.string().allow('').optional(),
});

module.exports = {
  getPurchPostInvoiceSchema,
  createPurchPostInvoiceSchema,
  updatePurchPostInvoiceSchema,
  queryPurchPostInvoiceSchema
};
