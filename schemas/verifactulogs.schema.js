const Joi = require('joi');

// Campos base para validación
const id = Joi.number().integer();
const invoiceCode = Joi.string().max(50);
const isTest = Joi.boolean();
const qrData = Joi.string().uri().max(2048); // Validamos que sea una URL válida y larga
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
 */
const queryVerifactuLogSchema = Joi.object({
  limit,
  offset,
  isTest,
  invoiceCode,
});

/**
 * Esquema de creación (Internal Only)
 */
const createVerifactuLogSchema = Joi.object({
  invoiceCode: invoiceCode.required(),
  isTest: isTest.default(false),
  qrData: qrData.optional(),
  fingerprint: Joi.string().optional(),
});

module.exports = {
  getVerifactuLogSchema,
  queryVerifactuLogSchema,
  createVerifactuLogSchema
};
