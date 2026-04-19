const Joi = require('joi');
// Importamos los esquemas de líneas
const { createSalesInvoiceLineSchema, updateSalesInvoiceLineSchema } = require('./salesInvoiceLine.schema');

// --- DEFINICIÓN DE TIPOS BASE ---
const code = Joi.string();
const selectedSerie = Joi.string();
const codePosting = Joi.string().allow('', null);

// NUEVOS: Campos Veri*factu
const typeInvoice = Joi.string().valid('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5').default('F1');
const parentCode = Joi.string().allow('', null);
// NUEVO: Validación del tipo de rectificación
const rectificationType = Joi.string().valid('S', 'I').allow(null);

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
const paymentMethod = Joi.string().valid('Tarjeta', 'Efectivo', 'Transferencia').default('Tarjeta');
const status = Joi.string().valid('Abierto', 'Pagado').default('Abierto');
const comments = Joi.string().allow('', null);

// Sincronizado con DECIMAL(12, 4)
const money = Joi.number().precision(4).default(0);
const username = Joi.string();

// Esquemas de consulta
const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

// --- ESQUEMAS DE ACCIÓN ---

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

    // Integración de nuevos campos
    typeInvoice: typeInvoice.optional(),
    parentCode: parentCode.optional(),
    rectificationType: rectificationType.optional(), // Agregado

    budgetCode: budgetCode.optional(),
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
    paymentMethod: paymentMethod.optional(),
    status: status.optional(),
    comments: comments.optional(),

    amountWithoutVAT: money.optional(),
    amountVAT: money.optional(),
    amountWithVAT: money.optional(),

    username: username.optional(),
    lines: Joi.array().items(createSalesInvoiceLineSchema).optional(),
});

/**
 * Esquema para ACTUALIZACIÓN
 */
const updateSalesInvoiceSchema = Joi.object({
    codePosting: codePosting.optional(),

    // Permitir actualizar el tipo o la referencia
    typeInvoice: typeInvoice.optional(),
    parentCode: parentCode.optional(),
    rectificationType: rectificationType.optional(), // Agregado

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
    lines: Joi.array().items(updateSalesInvoiceLineSchema).optional(),
});

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
