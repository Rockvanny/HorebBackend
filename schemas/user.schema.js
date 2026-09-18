const Joi = require('joi');
const { ROLES } = require('../config/access-manager');

// Definición de tipos base
const code = Joi.string(); // Cambiado a camelCase para consistencia
const fullName = Joi.string().min(3).max(100); // Nuevo campo
const email = Joi.string().email();
const password = Joi.string().min(8);
// Antes solo exigía "cadena de 5+ caracteres" (Joi.string().min(5)): aceptaba
// cualquier valor, incluido un rol mal escrito o inexistente en
// access-manager.js (ej. 'master', que llegó a estar en una lista de roles
// de este mismo archivo -services/user.service.js- sin existir realmente en
// ROLE_ACTIONS/ROLE_PAGES). Un usuario con un rol así no rompe nada -
// checkPermission() deniega todo en silencio-, pero es confuso: parece un
// bug, no una restricción esperada. Restringido a los roles que
// access-manager.js reconoce de verdad, importados de ahí como única fuente
// de verdad. SYSTEM se deja fuera a propósito: es un rol interno/de
// servicio, no algo asignable desde la gestión de usuarios.
const role = Joi.string().valid(
  ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR, ROLES.EXTERNO, ROLES.VIEWER, ROLES.OPERARIO
);
const mustChangePassword = Joi.boolean();

// Permisos de módulos (Booleanos)
const allowGestion = Joi.boolean();
const allowSales = Joi.boolean();
const allowPurchases = Joi.boolean();
const allowReports = Joi.boolean();
const allowSettings = Joi.boolean();

// --- Esquema para Login ---
const loginUserSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

// --- Esquemas para el 2º factor (OTP por email) ---
const verifyLoginOtpSchema = Joi.object({
  challengeId: Joi.string().guid().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
});

const resendLoginOtpSchema = Joi.object({
  challengeId: Joi.string().guid().required(),
});

// --- Esquema para cambio de contraseña propio (inicial o voluntario) ---
const updateOwnPasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  password: password.required(),
});

// --- Esquemas para "olvidé mi contraseña" (sin sesión previa) ---
const requestPasswordResetSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  challengeId: Joi.string().guid().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  password: password.required(),
});

// --- Esquema para Creación ---
const createUserSchema = Joi.object({
  code: code.allow('', null),
  fullName: fullName.required(), // Ahora es obligatorio al crear
  email: email.required(),
  password: password.required(),
  role: role.required(),
  mustChangePassword,
  allowGestion,
  allowSales,
  allowPurchases,
  allowReports,
  allowSettings
});

// --- Esquema para Actualización ---
const updateUserSchema = Joi.object({
  fullName: fullName, // Permitimos actualizar el nombre
  email: email,
  role: role,
  password: password,
  mustChangePassword,
  allowGestion,
  allowSales,
  allowPurchases,
  allowReports,
  allowSettings
});

// --- Esquema para Obtener (Query params / Params) ---
const getUserSchema = Joi.object({
  id: code.required(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  getUserSchema,
  loginUserSchema,
  verifyLoginOtpSchema,
  resendLoginOtpSchema,
  updateOwnPasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema
};
