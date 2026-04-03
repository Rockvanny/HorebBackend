const Joi = require('joi');

// Definición de tipos base
const Userid = Joi.string();
const email = Joi.string().email();
const password = Joi.string().min(8);
const role = Joi.string().min(5);

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

const createUserSchema = Joi.object({
    Userid: Userid.required(),
    email: email.required(),
    password: password.required(),
    role: role.required(),
    allowGestion,
    allowSales,
    allowPurchases,
    allowReports,
    allowSettings
});

const updateUserSchema = Joi.object({
    email: email,
    role: role,
    allowGestion,
    allowSales,
    allowPurchases,
    allowReports,
    allowSettings
});

const getUserSchema = Joi.object({
    id: Userid.required(),
});

// EXPORTA EL NUEVO ESQUEMA AQUÍ
module.exports = {
    createUserSchema,
    updateUserSchema,
    getUserSchema,
    loginUserSchema
};
