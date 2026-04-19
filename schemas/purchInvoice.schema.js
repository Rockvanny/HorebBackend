const Joi = require('joi');
// Importamos los esquemas de líneas específicos de compra
const { createPurchInvoiceLineSchema, updatePurchInvoiceLineSchema } = require('./purchInvoiceLine.schema');

// --- DEFINICIÓN DE TIPOS BASE ---
const code = Joi.string();
const selectedSerie = Joi.string(); // Necesario para el Hook de serie del backend
const codePosting = Joi.string().allow('', null);
const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const budgetCode = Joi.string().allow('', null);
const vendorCode = Joi.string(); // Identificador del proveedor
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

/**
 * Categorías globales para empresa de reformas.
 */
const category = Joi.string().valid(
  'Materiales',
  'Subcontratas',
  'Personal y Nóminas',
  'Herramientas y Alquileres',
  'Vehículos y Movilidad',
  'Gastos de Oficina y Varios'
);

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
const getPurchInvoiceSchema = Joi.object({
    code: code.required(),
});

/**
 * Esquema para CREACIÓN
 */
const createPurchInvoiceSchema = Joi.object({
    code: code.optional(),
    selectedSerie: selectedSerie.optional(),
    codePosting: codePosting.optional(),
    budgetCode: budgetCode.optional(),

    postingDate: postingDate.default(() => new Date()),
    dueDate: dueDate.optional(),
    vendorCode: vendorCode.required(),
    name: name.required(),
    nif: nif.required(),
    email: email.optional(),
    phone: phone.optional(),
    address: address.optional(),
    postCode: postCode.optional(),
    city: city.optional(),
    paymentMethod: paymentMethod.optional(),
    status: status.optional(),
    category: category.required(), // Obligatorio en creación
    comments: comments.optional(),

    // Totales calculados
    amountWithoutVAT: money.optional(),
    amountVAT: money.optional(),
    amountWithVAT: money.optional(),

    username: username.optional(),

    // Inserción masiva de líneas
    lines: Joi.array().items(createPurchInvoiceLineSchema).optional(),
});

/**
 * Esquema para ACTUALIZACIÓN (PATCH/PUT)
 * Se elimina vendorCode para evitar errores de campos inmutables en el backend
 */
const updatePurchInvoiceSchema = Joi.object({
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
    category: category.optional(),
    comments: comments.optional(),

    amountWithoutVAT: money.optional(),
    amountVAT: money.optional(),
    amountWithVAT: money.optional(),

    username: username.optional(),

    // Sincronización de líneas (Flush & Fill)
    lines: Joi.array().items(updatePurchInvoiceLineSchema).optional(),
});

/**
 * Esquema para filtrado y paginación
 */
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
