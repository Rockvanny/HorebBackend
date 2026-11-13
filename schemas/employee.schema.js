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
const appAccess = Joi.boolean();

// Datos personales y laborales (opcionales; null o '' los vacía al editar)
const optionalText = (max) => Joi.string().trim().max(max).allow('', null);
const personalData = {
  phone: optionalText(30),
  documentType: Joi.string().valid('DNI', 'NIE', 'Pasaporte').allow('', null),
  documentNumber: optionalText(30),
  address: optionalText(255),
  postCode: optionalText(10),
  city: optionalText(100),
  province: optionalText(100),
  jobTitle: optionalText(100),
  hireDate: Joi.date().iso().allow('', null),
  terminationDate: Joi.date().iso().allow('', null), // >= alta: employees.service.js
};

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
// Con acceso a la app (appAccess, por defecto sí) email, contraseña y rol
// son obligatorios, como antes; sin acceso, el empleado es solo una ficha
// (nóminas) y no los necesita. selectedSerie: serie del nº de empleado
// (employee.model.js#employeeNo).
const createEmployeeSchema = Joi.object({
  code: code.allow('', null),
  selectedSerie: Joi.string().required()
    .messages({ 'any.required': 'Elige la serie del número de empleado.' }),
  fullName: fullName.required(),
  appAccess: appAccess.default(true),
  email: email.when('appAccess', { is: false, then: Joi.allow('', null), otherwise: Joi.required() }),
  password: password.when('appAccess', { is: false, then: Joi.allow('', null), otherwise: Joi.required() }),
  role: role.when('appAccess', { is: false, then: Joi.optional(), otherwise: Joi.required() }),
  mustChangePassword,
  ...personalData,
});

// La comprobación de "con acceso hace falta email y contraseña" al editar
// necesita los datos guardados: está en employees.service.js#update.
const updateEmployeeSchema = Joi.object({
  fullName,
  appAccess,
  email: email.allow('', null),
  role,
  password,
  mustChangePassword,
  ...personalData,
});

const getEmployeeSchema = Joi.object({
  id: code.required(),
});

const lookupEmployeeSchema = Joi.object({
  searchTerm: Joi.string().trim().max(100).allow(''),
});

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
  getEmployeeSchema,
  lookupEmployeeSchema,
  loginEmployeeSchema,
  verifyEmployeeOtpSchema,
  resendEmployeeOtpSchema,
  requestEmployeePasswordResetSchema,
  resetEmployeePasswordSchema,
};
