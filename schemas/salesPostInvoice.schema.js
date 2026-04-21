const Joi = require('joi');
// Asumiendo que las líneas registradas también se normalizarán
const { createSalesPostInvoiceLineSchema } = require('./salesPostInvoiceLine.schema');

const code = Joi.string();
const preInvoice = Joi.string(); // Referencia al borrador original

// Veri*factu Enums (Igualado al borrador)
const typeInvoice = Joi.string().valid('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5').default('F1');
const parentCode = Joi.string().allow('', null);
const rectificationType = Joi.string().valid('S', 'I').allow(null);

const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const budgetCode = Joi.string().allow('', null);

// Sincronizado con el modelo de factura registrada (customerCode)
const customerCode = Joi.string();
const name = Joi.string().min(3).max(100);
const nif = Joi.string().min(5).max(20);
const email = Joi.string().email().allow('', null);
const phone = Joi.string().allow('', null);
const address = Joi.string().allow('', null);
const postCode = Joi.string().allow('', null);
const city = Joi.string().allow('', null);

// Enums de estado y pago
const paymentMethod = Joi.string().valid('Tarjeta', 'Efectivo', 'Transferencia').default('Tarjeta');
const status = Joi.string().valid('Abierto', 'Pagado').default('Abierto');
const comments = Joi.string().allow('', null);

// Precisión de 4 decimales para evitar descuadres en Veri*factu
const money = Joi.number().precision(4).default(0);
const username = Joi.string();

const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

// ESQUEMAS DE ACCIÓN

const getSalesPostInvoiceSchema = Joi.object({
    code: code.required(),
});

const createSalesPostInvoiceSchema = Joi.object({
    code: code.required(), // En registrada suele venir ya generado o por serie
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
    address: address.required(), // Requisito legal
    postCode: postCode.optional(),
    city: city.optional(),
    paymentMethod: paymentMethod.optional(),
    status: status.optional(),
    comments: comments.optional(),
    amountWithoutVAT: money.required(),
    amountVAT: money.required(),
    amountWithVAT: money.required(),
    username: username.optional(),
    // Líneas obligatorias al registrar
    lines: Joi.array().items(createSalesPostInvoiceLineSchema).min(1).required(),
});

/** * Nota: Aunque la factura sea "No editable", a veces es necesario
 * actualizar el 'status' (de Abierto a Pagado) o campos de Veri*factu.
 * He restringido este esquema para que solo permita tocar lo no crítico.
 */
const updateSalesPostInvoiceSchema = Joi.object({
    status: status.optional(),
    dueDate: dueDate.optional(),
    comments: comments.optional(),
    paymentMethod: paymentMethod.optional(),
    // Los campos de importes, NIF y fechas de devengo NO deberían estar aquí
    // para cumplir con la inalterabilidad de Veri*factu.
});

const querySalesPostInvoiceSchema = Joi.object({
    limit,
    offset,
    searchTerm: searchTerm.optional(),
});

module.exports = {
    getSalesPostInvoiceSchema,
    createSalesPostInvoiceSchema,
    updateSalesPostInvoiceSchema,
    querySalesPostInvoiceSchema
};
