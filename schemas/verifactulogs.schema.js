const Joi = require('joi');

// Campos base para validación
const id = Joi.number().integer();
const invoiceCode = Joi.string().max(50);
const isTest = Joi.boolean();
const limit = Joi.number().integer().min(1).max(100);
const offset = Joi.number().integer().min(0);

/**
 * Esquema para consultar un log específico por el código de la factura
 */
const getVerifactuLogSchema = Joi.object({
  invoiceCode: invoiceCode.required(),
});

/**
 * Esquema para el listado paginado y filtros
 * Útil para cuando el gestor quiera ver solo los reales o filtrar por factura
 */
const queryVerifactuLogSchema = Joi.object({
  limit,
  offset,
  isTest,
  invoiceCode,
});

/**
 * Esquema de creación (Internal Only)
 * Aunque se usa internamente, tenerlo definido ayuda a documentar
 * la estructura que espera el servicio.
 */
const createVerifactuLogSchema = Joi.object({
  invoiceCode: invoiceCode.required(),
  isTest: isTest.default(false),
  // No incluimos el hash aquí porque se genera automáticamente en el backend
});

module.exports = {
  getVerifactuLogSchema,
  queryVerifactuLogSchema,
  createVerifactuLogSchema
};
