const Joi = require('joi');
// Definición de tipos base
const code = Joi.string(); // Cambiado a camelCase para consistencia
const fullName = Joi.string().min(3).max(100); // Nuevo campo
const email = Joi.string().email();
const password = Joi.string().min(8);
const role = Joi.string().min(5);
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
  loginUserSchema
};
