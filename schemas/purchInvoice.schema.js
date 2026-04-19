const Joi = require('joi');
const { createPurchInvoiceLineSchema, updatePurchInvoiceLineSchema } = require('./purchInvoiceLine.schema');

// --- DEFINICIÓN DE TIPOS BASE ---
const code = Joi.string();
const selectedSerie = Joi.string();
const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const entityCode = Joi.string(); // NORMALIZADO (antes vendorCode)
const name = Joi.string().min(3).max(100);
const nif = Joi.string().min(5).max(20);
const email = Joi.string().email().allow('', null);
const phone = Joi.string().allow('', null);
const address = Joi.string().allow('', null);
const postCode = Joi.string().allow('', null);
const city = Joi.string().allow('', null);
const paymentMethod = Joi.string().valid('Tarjeta', 'Efectivo', 'Transferencia').default('Tarjeta');
const status = Joi.string().default('Abierto'); // Sincronizado con Ofertas
const comments = Joi.string().allow('', null);

const category = Joi.string().valid(
  'Materiales',
  'Subcontratas',
  'Personal y Nóminas',
  'Herramientas y Alquileres',
  'Vehículos y Movilidad',
  'Gastos de Oficina y Varios'
);

const money = Joi.number().precision(4).default(0);
const username = Joi.string();

// Esquemas de consulta
const limit = Joi.number().integer();
const offset = Joi.number().integer();
const searchTerm = Joi.string().allow('');

// --- ESQUEMAS DE ACCIÓN ---

const getPurchInvoiceSchema = Joi.object({
    code: code.required(),
});

const createPurchInvoiceSchema = Joi.object({
    code: code.optional(),
    selectedSerie: selectedSerie.optional(),
    // Campos específicos de compra se mantienen pero el resto es idéntico
    postingDate: postingDate.default(() => new Date()),
    dueDate: dueDate.optional(),
    entityCode: entityCode.required(), // NORMALIZADO
    name: name.required(),
    nif: nif.required(),
    email: email.optional(),
    phone: phone.optional(),
    address: address.optional(),
    postCode: postCode.optional(),
    city: city.optional(),

    paymentMethod: paymentMethod.optional(),
    category: category.required(),

    status: status.optional(),
    comments: comments.optional(),

    amountWithoutVAT: money.optional(),
    amountVAT: money.optional(),
    amountWithVAT: money.optional(),

    username: username.optional(),
    lines: Joi.array().items(createPurchInvoiceLineSchema).optional(),
});

const updatePurchInvoiceSchema = Joi.object({
    postingDate: postingDate.optional(),
    dueDate: dueDate.optional(),
    entityCode: entityCode.optional(), // NORMALIZADO
    name: name.optional(),
    nif: nif.optional().allow(''),
    email: email.optional(),
    phone: phone.optional(),
    address: address.optional(),
    postCode: postCode.optional(),
    city: city.optional(),

    paymentMethod: paymentMethod.optional(),
    category: category.optional(),

    status: status.optional(),
    comments: comments.optional(),

    amountWithoutVAT: money.optional(),
    amountVAT: money.optional(),
    amountWithVAT: money.optional(),

    username: username.optional(),
    lines: Joi.array().items(updatePurchInvoiceLineSchema).optional(),
});

const queryPurchInvoiceSchema = Joi.object({
    limit,
    offset,
    searchTerm: searchTerm.optional(),
});

module.exports = {
    getPurchInvoiceSchema,
    createPurchInvoiceSchema,
    updatePurchInvoiceSchema,
    queryPurchInvoiceSchema
};
