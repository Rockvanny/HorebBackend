const Joi = require('joi');
// Importamos tanto el de creación como el de actualización de líneas
const { createSalesBudgetLineSchema, updateSalesBudgetLineSchema } = require('./salesBudgetLines.schema');

// --- DEFINICIÓN DE TIPOS BASE ---
const code = Joi.string();
const selectedSerie = Joi.string(); // Campo necesario para el Hook de serie del backend
const postingDate = Joi.date();
const dueDate = Joi.date().allow(null);
const entityCode = Joi.string();
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

/**
 * Esquema para obtener un registro por su PK
 */
const getSalesBudgetSchema = Joi.object({
    code: code.required(),
});

/**
 * Esquema para CREACIÓN
 * Permite recibir el documento completo (Cabecera + Líneas)
 */
const createSalesBudgetSchema = Joi.object({
    code: code.optional(), // Opcional porque lo genera el hook beforeCreate
    selectedSerie: selectedSerie.optional(), // Serie elegida en el combo de Electron

    postingDate: postingDate.default(() => new Date()),
    dueDate: dueDate.optional(),
    entityCode: entityCode.required(),
    name: name.required(),
    nif: nif.required(),
    email: email.optional(),
    phone: phone.optional(),
    address: address.optional(),
    postCode: postCode.optional(),
    city: city.optional(),
    status: status.optional(),
    comments: comments.optional(),

    // Totales calculados en el Front
    amountWithoutVAT: money.optional(),
    amountVAT: money.optional(),
    amountWithVAT: money.optional(),

    username: username.optional(),

    // Inserción masiva de líneas
    lines: Joi.array().items(createSalesBudgetLineSchema).optional(),
});

/**
 * Esquema para ACTUALIZACIÓN (PATCH/PUT)
 * Se vuelve flexible con el 'code' ya que suele venir por req.params
 */
const updateSalesBudgetSchema = Joi.object({
    postingDate: postingDate.optional(),
    dueDate: dueDate.optional(),
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

    // Sincronización de líneas (Flush & Fill)
    lines: Joi.array().items(updateSalesBudgetLineSchema).optional(),
});

/**
 * Esquema para filtrado y paginación
 */
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
