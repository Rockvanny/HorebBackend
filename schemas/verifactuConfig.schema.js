const Joi = require('joi');

const id = Joi.number().integer();
const useProvider = Joi.boolean();
const providerName = Joi.string().min(2).max(100);
const apiBaseUrl = Joi.string().uri().max(255);
const apiKey = Joi.string().min(3).max(255);
// El secret llega en claro desde el front y se cifra en el service (ver
// libs/crypto.js) antes de guardarlo; el schema solo valida el texto plano
// que manda el usuario.
const apiSecret = Joi.string().min(3).max(500);

const getVerifactuConfigSchema = Joi.object({
  id: id.required(),
});

// El front siempre envía el estado completo del formulario (ver
// fields-verifactuconfig-handler.js), así que basta con condicionar los
// campos de proveedor a que 'useProvider' venga en true EN EL MISMO body.
const providerFields = {
  providerName: providerName.when('useProvider', { is: true, then: Joi.required(), otherwise: Joi.optional().allow('', null) }),
  apiBaseUrl: apiBaseUrl.when('useProvider', { is: true, then: Joi.required(), otherwise: Joi.optional().allow('', null) }),
  apiKey: apiKey.when('useProvider', { is: true, then: Joi.required(), otherwise: Joi.optional().allow('', null) }),
  // El secret es la única excepción: si ya hay uno guardado, no se reenvía
  // en claro solo por reeditar otros campos (ver GET, que lo devuelve
  // enmascarado). Queda opcional incluso con useProvider=true.
  apiSecret: apiSecret.optional().allow('', null),
};

const createVerifactuConfigSchema = Joi.object({
  useProvider: useProvider.default(false),
  ...providerFields,
});

const updateVerifactuConfigSchema = Joi.object({
  useProvider: useProvider.required(),
  ...providerFields,
}).min(1);

const queryVerifactuConfigSchema = Joi.object({
  limit: Joi.number().integer().optional(),
  offset: Joi.number().integer().optional(),
  searchTerm: Joi.string().allow('', null).optional(),
});

module.exports = {
  getVerifactuConfigSchema,
  createVerifactuConfigSchema,
  updateVerifactuConfigSchema,
  queryVerifactuConfigSchema
};
