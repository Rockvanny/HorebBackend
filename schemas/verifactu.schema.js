const Joi = require('joi');

// Definimos cómo debe ser el código de la factura
const invoiceCode = Joi.string().min(3).max(50);

const getVerifactuSchema = Joi.object({
  invoiceCode: invoiceCode.required(),
});

module.exports = { getVerifactuSchema };
