const Joi = require('joi');

const id = Joi.number().integer();
// CAMBIO: Ahora validamos que sea un UUID estándar
const movementId = Joi.string().uuid({ version: 'uuidv4' });
const codeDocument = Joi.string().valid('budget', 'salesinvoice', 'salespostinvoice', 'purchinvoice', 'purchpostinvoice');
const taxType = Joi.string().default('IVA');
const taxPercentage = Joi.number().precision(2).min(0).max(100);
const money = Joi.number().precision(4).default(0);

const createDocumentTaxSchema = Joi.object({
    codeDocument: codeDocument.required(),
    movementId: movementId.required(), // El "ADN" del documento es obligatorio
    taxType: taxType.optional(),
    taxPercentage: taxPercentage.required(),
    taxableAmount: money.required(),
    taxAmount: money.required()
});

const filterDocumentTaxSchema = Joi.object({
    codeDocument: codeDocument.required(),
    movementId: movementId.required()
});

module.exports = {
    createDocumentTaxSchema,
    filterDocumentTaxSchema,
    idSchema: Joi.object({ id: id.required() })
};
