const Joi = require('joi');

// Convención de MODULE_HIERARCHY en config/access-manager.js: claves en
// mayúsculas, sin espacios (VERIFACTU, GESTION...). Es la clave con la que
// el resto del backend consulta el flag (ver
// services/moduleConfig.service.js#isEnabled), así que se fija el formato
// desde el schema para no acabar con claves inconsistentes.
const key = Joi.string().pattern(/^[A-Z][A-Z0-9_]*$/).min(3).max(50);
const name = Joi.string().min(3).max(100);
const description = Joi.string().max(255).allow('', null);
const enabled = Joi.boolean();

const getModuleConfigSchema = Joi.object({
  key: key.required(),
});

const createModuleConfigSchema = Joi.object({
  key: key.required(),
  name: name.required(),
  description: description.optional(),
  enabled: enabled.default(false),
});

// La clave es la PK y va en la URL (PATCH /:key), no se acepta en el body.
const updateModuleConfigSchema = Joi.object({
  name: name.optional(),
  description: description.optional(),
  enabled: enabled.optional(),
}).min(1);

const queryModuleConfigSchema = Joi.object({
  limit: Joi.number().integer().optional(),
  offset: Joi.number().integer().optional(),
  searchTerm: Joi.string().allow('', null).optional(),
});

module.exports = {
  getModuleConfigSchema,
  createModuleConfigSchema,
  updateModuleConfigSchema,
  queryModuleConfigSchema
};
