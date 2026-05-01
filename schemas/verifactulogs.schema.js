const Joi = require('joi');

// Campos base para validación
const id = Joi.number().integer();
const invoiceCode = Joi.string().max(50);
const isTest = Joi.boolean();
const qrData = Joi.string().uri().max(2048);
const exportedAt = Joi.date().iso();

// Nuevo campo: Referencia externa (CSV de la AEAT)
// Lo definimos con un rango amplio para cubrir distintos formatos de justificantes
const externalReference = Joi.string().min(5).max(100).allow('', null);

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
  exportedAt,
  externalReference, // Permitimos filtrar por el código de la AEAT
});

/**
 * Esquema para la actualización manual del justificante (PATCH)
 * Este es el que usarás cuando el usuario pegue el código en el front
 */
const updateExternalReferenceSchema = Joi.object({
  externalReference: externalReference.required(),
});

/**
 * Esquema de creación (Internal Only)
 */
const createVerifactuLogSchema = Joi.object({
  invoiceCode: invoiceCode.required(),
  isTest: isTest.default(false),
  qrData: qrData.optional(),
  fingerprint: Joi.string().optional(),
  exportedAt: exportedAt.optional().allow(null),
  externalReference: externalReference.optional().allow(null),
});

module.exports = {
  getVerifactuLogSchema,
  queryVerifactuLogSchema,
  createVerifactuLogSchema,
  updateExternalReferenceSchema // Exportamos el nuevo esquema
};
