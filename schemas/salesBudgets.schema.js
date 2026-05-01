const Joi = require('joi');
// Importamos los esquemas de líneas
const { createSalesBudgetLineSchema, updateSalesBudgetLineSchema } = require('./salesBudgetLines.schema');

// --- DEFINICIÓN DE TIPOS BASE ---
const id = Joi.number().integer();
const movementId = Joi.string().uuid({ version: 'uuidv4' }); // El identificador único de movimiento
const code = Joi.string();
const selectedSerie = Joi.string();
const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const entityCode = Joi.string();
const name = Joi.string().min(3).max(100);
const nif = Joi.string().min(5).max(20);
const email = Joi.string().email().allow('', null);
const phone = Joi.string().allow('', null);
const address = Joi.string().allow('', null);
const postCode = Joi.string().allow('', null);
const city = Joi.string().allow('', null);
const status = Joi.string().default('Borrador');
const paymentMethod = Joi.string().valid(
  'Transferencia',
  'Efectivo',
  'Tarjeta',
  'Bizum'
);
const comments = Joi.string().allow('', null);

// Sincronizado con DECIMAL(12, 4)
const money = Joi.number().precision(4).default(0);
const username = Joi.string();

// Esquemas de consulta
const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

// --- ESQUEMAS DE ACCIÓN ---

/**
 * Esquema para obtener un registro por su ID numérico (PK física)
 */
const getSalesBudgetSchema = Joi.object({
  id: Joi.alternatives().try(
    Joi.number().integer(),
    Joi.string()
  ).required(),
});

/**
 * Esquema para CREACIÓN
 * El movementId es opcional porque el Hook lo genera si no viene.
 */
const createSalesBudgetSchema = Joi.object({
  movementId: movementId.optional(),
  code: code.optional(),
  selectedSerie: selectedSerie.optional(),

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
  status: status.optional(),
  paymentMethod: paymentMethod.default('Transferencia'),
  comments: comments.optional(),

  amountWithoutVAT: money.optional(),
  amountVAT: money.optional(),
  amountWithVAT: money.optional(),

  username: username.optional(),

  // Inserción de líneas
  lines: Joi.array().items(createSalesBudgetLineSchema).optional(),
});

/**
 * Esquema para ACTUALIZACIÓN
 * movementId OMITIDO: No se permite su modificación vía API
 */
const updateSalesBudgetSchema = Joi.object({
  postingDate: postingDate.optional(),
  dueDate: dueDate.optional(),
  entityCode: Joi.string(),
  name: name.optional(),
  nif: nif.optional().allow(''),
  email: email.optional(),
  phone: phone.optional(),
  address: address.optional(),
  postCode: postCode.optional(),
  city: city.optional(),
  status: status.optional(),
  paymentMethod: paymentMethod.optional(),
  comments: comments.optional(),

  amountWithoutVAT: money.optional(),
  amountVAT: money.optional(),
  amountWithVAT: money.optional(),

  username: username.optional(),

  // Sincronización de líneas
  lines: Joi.array().items(updateSalesBudgetLineSchema).optional(),
});

/**
 * Esquema para filtrado y paginación
 */
const querySalesBudgetSchema = Joi.object({
  limit,
  offset,
  searchTerm: searchTerm.optional(),
});

module.exports = {
  getSalesBudgetSchema,
  createSalesBudgetSchema,
  updateSalesBudgetSchema,
  querySalesBudgetSchema
};
