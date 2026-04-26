const Joi = require('joi');
const { createSalesPostInvoiceLineSchema } = require('./salesPostInvoiceLine.schema');

const id = Joi.number().integer();
// --- NUEVO: VALIDACIÓN PARA EL UUID HEREDADO ---
const movementId = Joi.string().uuid();
// ----------------------------------------------
const code = Joi.string();
const seriesCode = Joi.string();
const preInvoice = Joi.string();
const typeInvoice = Joi.string().valid('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5').default('F1');
const parentCode = Joi.string().allow('', null);
const rectificationType = Joi.string().valid('S', 'I').allow(null);
const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const budgetCode = Joi.string().allow('', null);
const entityCode = Joi.string();
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
const money = Joi.number().precision(4).default(0);
const username = Joi.string();

const getSalesPostInvoiceSchema = Joi.object({ code: code.required() });

const createSalesPostInvoiceSchema = Joi.object({
    movementId: movementId.required(), // Obligatorio para heredar la trazabilidad
    code: code.required(),
    seriesCode: seriesCode.optional(),
    preInvoice: preInvoice.required(),
    typeInvoice: typeInvoice.required(),
    parentCode: parentCode.optional(),
    rectificationType: rectificationType.optional(),
    budgetCode: budgetCode.optional(),
    postingDate: postingDate.required(),
    dueDate: dueDate.optional(),
    entityCode: entityCode.required(),
    name: name.required(),
    nif: nif.required(),
    email: email.optional(),
    phone: phone.optional(),
    address: address.required(),
    postCode: postCode.optional(),
    city: city.optional(),
    paymentMethod: paymentMethod.optional(),
    status: status.optional(),
    comments: comments.optional(),
    amountWithoutVAT: money.required(),
    amountVAT: money.required(),
    amountWithVAT: money.required(),
    username: username.optional(),
    lines: Joi.array().items(createSalesPostInvoiceLineSchema).min(1).required(),
});

const updateSalesPostInvoiceSchema = Joi.object({
    id: id.optional(),
    status: status.optional(),
    dueDate: dueDate.optional(),
    comments: comments.optional(),
    paymentMethod: paymentMethod.optional(),
});

const querySalesPostInvoiceSchema = Joi.object({
    limit: Joi.number().integer(),
    offset: Joi.number().integer(),
    searchTerm: Joi.string().allow('').optional(),
});

module.exports = {
    getSalesPostInvoiceSchema,
    createSalesPostInvoiceSchema,
    updateSalesPostInvoiceSchema,
    querySalesPostInvoiceSchema
};
