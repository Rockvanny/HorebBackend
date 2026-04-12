const Joi = require('joi');
// Importamos tanto el de creación como el de actualización de líneas
const { createSalesBudgetLineSchema, updateSalesBudgetLineSchema } = require('./salesBudgetLines.schema');

// Definición de tipos base
const code = Joi.string();
const postingDate = Joi.date();
const dueDate = Joi.date().allow(null); // Permitir nulo si no hay vencimiento claro
const customerCode = Joi.string();
const name = Joi.string().min(3).max(100);
const nif = Joi.string().min(5).max(20);
const email = Joi.string().email().allow('', null);
const phone = Joi.string().allow('', null);
const address = Joi.string().allow('', null);
const postCode = Joi.string().allow('', null);
const city = Joi.string().allow('', null);
const status = Joi.string().default('Borrador');
const comments = Joi.string().allow('', null);

// Sincronizado con DECIMAL(12, 4) de la DB para los cálculos
const money = Joi.number().precision(4).default(0);

const username = Joi.string();

// Esquemas de consulta
const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

// --- ESQUEMAS DE ACCIÓN ---

const getSalesBudgetSchema = Joi.object({
    code: code.required(),
});

const createSalesBudgetSchema = Joi.object({
    code: code.optional(), // Opcional porque lo genera el hook beforeValidate
    // CORRECCIÓN: Se pasa la función directamente para evitar el error de "Options must be of type object"
    postingDate: postingDate.default(() => new Date()),
    dueDate: dueDate.optional(),
    customerCode: customerCode.required(),
    name: name.required(),
    nif: nif.required(),
    email: email.optional(),
    phone: phone.optional(),
    address: address.optional(),
    postCode: postCode.optional(),
    city: city.optional(),
    status: status.optional(),
    comments: comments.optional(),

    // Totales
    amountWithoutVAT: money.optional(),
    amountVAT: money.optional(),
    amountWithVAT: money.optional(),

    username: username.optional(),

    // IMPORTANTE: Permitir crear presupuesto con sus líneas de golpe
    lines: Joi.array().items(createSalesBudgetLineSchema).optional(),
});

const updateSalesBudgetSchema = Joi.object({
    // El code es necesario para identificar el registro
    code: code.required(),

    postingDate: postingDate.optional(),
    dueDate: dueDate.optional(),
    customerCode: customerCode.optional(),
    name: name.optional(),
    nif: nif.optional().allow(''),
    email: email.optional(),
    phone: phone.optional(),
    address: address.optional(),
    postCode: postCode.optional(),
    city: city.optional(),
    status: status.optional(),
    comments: comments.optional(),

    amountWithoutVAT: money.optional(),
    amountVAT: money.optional(),
    amountWithVAT: money.optional(),

    username: username.optional(),

    // Gestión de líneas en la actualización
    lines: Joi.array().items(updateSalesBudgetLineSchema).optional(),
});

const querySalesBudgetSchema = Joi.object({
    limit,
    offset,
    searchTerm: searchTerm.optional(),
});

module.exports = {
    getSalesBudgetSchema,
    createSalesBudgetSchema,
    updateSalesBudgetSchema,
    querySalesBudgetSchema
};
