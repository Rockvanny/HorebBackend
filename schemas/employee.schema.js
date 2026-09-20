const Joi = require('joi');
const { ROLES } = require('../config/access-manager');

// Mismos 6 roles que Users (fuente única de verdad: access-manager.js), pero
// SIN los flags allowGestion/allowSales/etc -esos son del sistema de
// módulos/checkAction del Frontend, que Employee no usa: toda la
// autorización móvil es por rol (checkRole), ver employees.router.js.
const code = Joi.string();
const fullName = Joi.string().min(3).max(100);
const email = Joi.string().email();
const password = Joi.string().min(8);
const role = Joi.string().valid(
  ROLES.ADMIN, ROLES.FINANCIERO, ROLES.VENDEDOR, ROLES.EXTERNO, ROLES.VIEWER, ROLES.OPERARIO
);
const mustChangePassword = Joi.boolean();

// --- Login en 2 pasos (igual que Users/Customers) ---
const loginEmployeeSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
});

const verifyEmployeeOtpSchema = Joi.object({
  challengeId: Joi.string().guid().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
});

const resendEmployeeOtpSchema = Joi.object({
  challengeId: Joi.string().guid().required(),
});

// --- "Olvidé mi contraseña" (sin sesión previa) ---
const requestEmployeePasswordResetSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetEmployeePasswordSchema = Joi.object({
  challengeId: Joi.string().guid().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  password: password.required(),
});

// --- CRUD (alta/gestión de empleados, admin de escritorio o de móvil) ---
const createEmployeeSchema = Joi.object({
  code: code.allow('', null),
  fullName: fullName.required(),
  email: email.required(),
  password: password.required(),
  role: role.required(),
  mustChangePassword,
});

const updateEmployeeSchema = Joi.object({
  fullName,
  email,
  role,
  password,
  mustChangePassword,
});

const getEmployeeSchema = Joi.object({
  id: code.required(),
});

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
  getEmployeeSchema,
  loginEmployeeSchema,
  verifyEmployeeOtpSchema,
  resendEmployeeOtpSchema,
  requestEmployeePasswordResetSchema,
  resetEmployeePasswordSchema,
};
