const Joi = require('joi');

const createFirstAdminSchema = Joi.object({
  fullName: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  // País y características (ver libs/regionDefaults.js): Veri*factu por
  // defecto solo en España; el país decide el catálogo de impuestos inicial
  country: Joi.string().valid('ES', 'CO', 'OTHER').default('ES'),
  verifactu: Joi.boolean(),
  // Moneda de la instalación (fija); si no se elige, la del país
  currency: Joi.string().valid('EUR', 'COP', 'USD', 'MXN', 'PEN', 'CLP', 'ARS'),
});

module.exports = { createFirstAdminSchema };
