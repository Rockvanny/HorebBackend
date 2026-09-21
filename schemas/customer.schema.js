const Joi = require('joi');

const code = Joi.string();
const name = Joi.string().min(3).max(50);
const nif = Joi.string().min(9).max(15);
const email = Joi.string().email();
const phone =  Joi.string();
const address = Joi.string();
const postCode = Joi.string();
const city =  Joi.string();
const province = Joi.string().allow('', null);
const paymentMethod = Joi.string().valid(
  'Transferencia',
  'Efectivo',
  'Tarjeta',
  'Bizum'
);
// Acceso a la app móvil (ver customer.model.js#appAccessEnabled): solo lo
// fija el personal interno desde la ficha, nunca el propio cliente -no
// aparece en ningún schema de autoservicio (registro/login) de más abajo-.
const appAccessEnabled = Joi.boolean();

const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('', null);

const getCustomerSchema = Joi.object({
  code: code.required(),
});

const createCustomerSchema = Joi.object({
  selectedSerie: Joi.string().required(),
  code: code.optional(),
  name: name.required(),
  nif: nif.required(),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  province: province.optional(),
  paymentMethod: paymentMethod.default('Transferencia'),
  appAccessEnabled: appAccessEnabled.default(false),
});

const updateCustomerSchema = Joi.object({
  name: name.required(),
  nif: nif.optional().allow(''),
  email: email.required(),
  phone: phone.required(),
  address: address.required(),
  postCode: postCode.required(),
  city: city.required(),
  province: province.optional(),
  paymentMethod: paymentMethod.optional(),
  appAccessEnabled: appAccessEnabled.optional(),
});

const queryCustomerSchema = Joi.object({
  limit,
  offset,
  searchTerm
});

// --- Autoservicio de clientes (app móvil) ---
const password = Joi.string().min(8);

const registerCustomerAccountSchema = Joi.object({
  nif: nif.required(),
  email: email.required(),
  password: password.required(),
});

const loginCustomerSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required(),
});

const verifyCustomerOtpSchema = Joi.object({
  challengeId: Joi.string().guid().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
});

const resendCustomerOtpSchema = Joi.object({
  challengeId: Joi.string().guid().required(),
});

// --- "Olvidé mi contraseña" (sin sesión previa) ---
const requestCustomerPasswordResetSchema = Joi.object({
  email: email.required(),
});

const resetCustomerPasswordSchema = Joi.object({
  challengeId: Joi.string().guid().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  password: password.required(),
});

module.exports = {
  getCustomerSchema,
  createCustomerSchema,
  updateCustomerSchema,
  queryCustomerSchema,
  registerCustomerAccountSchema,
  loginCustomerSchema,
  verifyCustomerOtpSchema,
  resendCustomerOtpSchema,
  requestCustomerPasswordResetSchema,
  resetCustomerPasswordSchema,
};
