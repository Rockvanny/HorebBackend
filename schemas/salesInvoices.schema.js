const Joi = require('joi');
// Importamos los esquemas de líneas (Asegúrate de que los nombres de los archivos coincidan)
const { createSalesInvoiceLineSchema, updateSalesInvoiceLineSchema } = require('./salesInvoiceLine.schema');

// --- DEFINICIÓN DE TIPOS BASE ---
const code = Joi.string();
const selectedSerie = Joi.string(); // Necesario para el hook de generación de código
const codePosting = Joi.string().allow('', null);
const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const budgetCode = Joi.string().allow('', null);
const customerCode = Joi.string();
const name = Joi.string().min(3).max(100);
const nif = Joi.string().min(5).max(20);
const email = Joi.string().email().allow('', null);
const phone = Joi.string().allow('', null);
const address = Joi.string().allow('', null);
const postCode = Joi.string().allow('', null);
const city = Joi.string().allow('', null);
const paymentMethod = Joi.string().allow('', null);
const status = Joi.string().default('Abierto');
const comments = Joi.string().allow('', null);

// Sincronizado con DECIMAL(12, 4) de la DB
const money = Joi.number().precision(4).default(0);

const username = Joi.string();

// Esquemas de consulta
const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

// --- ESQUEMAS DE ACCIÓN ---

/**
 * Esquema para obtener un registro por su PK
 */
const getSalesInvoiceSchema = Joi.object({
    code: code.required(),
});

/**
 * Esquema para CREACIÓN
 */
const createSalesInvoiceSchema = Joi.object({
    code: code.optional(),
    selectedSerie: selectedSerie.optional(),
    codePosting: codePosting.optional(),
    budgetCode: budgetCode.optional(),

    postingDate: postingDate.default(() => new Date()),
    dueDate: dueDate.optional(),
    customerCode: customerCode.required(),
    name: name.required(),
    nif: nif.required(), // Estandarizado con el base
    email: email.optional(),
    phone: phone.optional(),
    address: address.optional(),
    postCode: postCode.optional(),
    city: city.optional(),
    paymentMethod: paymentMethod.optional(),
    status: status.optional(),
    comments: comments.optional(),

    // Totales calculados
    amountWithoutVAT: money.optional(),
    amountVAT: money.optional(),
    amountWithVAT: money.optional(),

    username: username.optional(),

    // Inserción masiva de líneas
    lines: Joi.array().items(createSalesInvoiceLineSchema).optional(),
});

/**
 * Esquema para ACTUALIZACIÓN (PATCH/PUT)
 * IMPORTANTE: No incluimos customerCode para evitar el error 400 "not allowed"
 */
const updateSalesInvoiceSchema = Joi.object({
    codePosting: codePosting.optional(),
    budgetCode: budgetCode.optional(),
    postingDate: postingDate.optional(),
    dueDate: dueDate.optional(),
    name: name.optional(),
    nif: nif.optional().allow(''),
    email: email.optional(),
    phone: phone.optional(),
    address: address.optional(),
    postCode: postCode.optional(),
    city: city.optional(),
    paymentMethod: paymentMethod.optional(),
    status: status.optional(),
    comments: comments.optional(),

    amountWithoutVAT: money.optional(),
    amountVAT: money.optional(),
    amountWithVAT: money.optional(),

    username: username.optional(),

    // Sincronización de líneas (Flush & Fill)
    lines: Joi.array().items(updateSalesInvoiceLineSchema).optional(),
});

/**
 * Esquema para filtrado y paginación
 */
const querySalesInvoiceSchema = Joi.object({
    limit,
    offset,
    searchTerm: searchTerm.optional(),
});

module.exports = {
    getSalesInvoiceSchema,
    createSalesInvoiceSchema,
    updateSalesInvoiceSchema,
    querySalesInvoiceSchema
};
