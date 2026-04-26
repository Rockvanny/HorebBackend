const Joi = require('joi');

// --- DEFINICIÓN DE TIPOS BASE ---
const id = Joi.number().integer();
const invoiceCode = Joi.string();
const taxType = Joi.string().default('IVA');
const taxPercentage = Joi.number().precision(2).min(0).max(100);
const money = Joi.number().precision(4).default(0);

// --- ESQUEMAS DE ACCIÓN ---

/**
 * Esquema para CREACIÓN
 * Se usa tanto para salesInvoiceTax como para salesPostInvoiceTax
 */
const createInvoiceTaxSchema = Joi.object({
    invoiceCode: invoiceCode.required(),
    taxType: taxType.optional(),
    taxPercentage: taxPercentage.required(),
    taxableAmount: money.required(),
    taxAmount: money.required()
});

/**
 * Esquema para ACTUALIZACIÓN
 * (Principalmente para borradores, aunque se suelen recrear de cero)
 */
const updateInvoiceTaxSchema = Joi.object({
    taxType: taxType.optional(),
    taxPercentage: taxPercentage.optional(),
    taxableAmount: money.optional(),
    taxAmount: money.optional()
});

/**
 * Esquema para filtrado por factura (Usado en las rutas by-invoice)
 */
const filterInvoiceTaxSchema = Joi.object({
    invoiceCode: invoiceCode.required()
});

/**
 * Esquema para obtener un registro individual por ID
 */
const getInvoiceTaxSchema = Joi.object({
    id: id.required()
});

module.exports = {
    getInvoiceTaxSchema,
    createInvoiceTaxSchema,
    updateInvoiceTaxSchema,
    filterInvoiceTaxSchema
};
