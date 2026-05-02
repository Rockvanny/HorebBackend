const Joi = require('joi');
const { createPurchInvoiceLineSchema, updatePurchInvoiceLineSchema } = require('./purchInvoiceLine.schema');

// --- DEFINICIÓN DE TIPOS BASE ---
const id = Joi.number().integer();
const movementId = Joi.string().guid({ version: 'uuidv4' });
const code = Joi.string();
const selectedSerie = Joi.string();
const seriesCode = Joi.string().allow('', null);
const codePosting = Joi.string().allow('', null);
const budgetCode = Joi.string().allow('', null);

// Campos de tipo de factura (Espejo de Ventas)
const typeInvoice = Joi.string().valid('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5');
const parentCode = Joi.string().allow('', null);
const rectificationType = Joi.string().valid('S', 'I').allow(null);

const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const entityCode = Joi.string();
const name = Joi.string().min(3).max(100);
const nif = Joi.string().min(5).max(20);
const email = Joi.string().email().allow('', null);
const phone = Joi.string().allow('', null);
const address = Joi.string().min(5);
const postCode = Joi.string().allow('', null);
const city = Joi.string().allow('', null);

const status = Joi.string().valid('Abierto', 'Pagado').default('Abierto');

const category = Joi.string().valid(
  'Materiales',
  'Subcontratas',
  'Personal y Nóminas',
  'Herramientas y Alquileres',
  'Vehículos y Movilidad',
  'Gastos de Oficina y Varios'
);

const paymentMethod = Joi.string().valid(
  'Transferencia',
  'Efectivo',
  'Tarjeta',
  'Bizum'
);

const money = Joi.number().precision(4).default(0);
const comments = Joi.string().allow('', null);
const userName = Joi.string(); // Sincronizado con el modelo

// --- ESQUEMAS DE ACCIÓN ---

/**
 * Esquema para CREACIÓN
 */
const createPurchInvoiceSchema = Joi.object({
  movementId: movementId.optional(), // Se puede generar automáticamente pero se permite enviarlo
  code: code.optional(),
  selectedSerie: selectedSerie.optional(),
  seriesCode: seriesCode.optional(),

  typeInvoice: typeInvoice.default('F1'),
  parentCode: parentCode.optional(),
  rectificationType: rectificationType.optional(),

  codePosting: codePosting.optional(),
  budgetCode: budgetCode.optional(),

  postingDate: postingDate.default(() => new Date()).required(),
  dueDate: dueDate.optional(),

  // Identificación del Proveedor
  entityCode: entityCode.required(),
  name: name.required(),
  nif: nif.required(),
  address: address.required(),

  email: email.optional(),
  phone: phone.optional(),
  postCode: postCode.optional(),
  city: city.optional(),

  // Clasificación y Pago
  category: category.required(),
  paymentMethod: paymentMethod.default('Transferencia'),
  status: status.optional(),

  // Totales
  amountWithoutVAT: money.optional(),
  amountVAT: money.optional(),
  amountWithVAT: money.optional(),

  comments: comments.optional(),
  userName: userName.optional(),

  // Líneas de la factura
  lines: Joi.array().items(createPurchInvoiceLineSchema).optional(),
});

/**
 * Esquema para ACTUALIZACIÓN
 */
const updatePurchInvoiceSchema = Joi.object({
  seriesCode: seriesCode.optional(),
  typeInvoice: typeInvoice.optional(),
  parentCode: parentCode.optional(),
  rectificationType: rectificationType.optional(),

  codePosting: codePosting.optional(),
  budgetCode: budgetCode.optional(),
  postingDate: postingDate.optional(),
  dueDate: dueDate.optional(),
  entityCode: entityCode.optional(),
  name: name.optional(),
  nif: nif.optional(),
  address: address.optional(),
  email: email.optional(),
  phone: phone.optional(),
  postCode: postCode.optional(),
  city: city.optional(),
  category: category.optional(),
  paymentMethod: paymentMethod.optional(),
  status: status.optional(),
  amountWithoutVAT: money.optional(),
  amountVAT: money.optional(),
  amountWithVAT: money.optional(),
  comments: comments.optional(),
  userName: userName.optional(),
  lines: Joi.array().items(updatePurchInvoiceLineSchema).optional(),
});

module.exports = {
  getPurchInvoiceSchema: Joi.object({ code: code.required() }),
  createPurchInvoiceSchema,
  updatePurchInvoiceSchema,
  queryPurchInvoiceSchema: Joi.object({
    limit: Joi.number().integer(),
    offset: Joi.number().integer(),
    searchTerm: Joi.string().allow('')
  })
};
