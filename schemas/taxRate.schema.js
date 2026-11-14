const Joi = require('joi');
const { TAX_CLASSES, EXEMPTION_CAUSES } = require('../libs/taxClasses');

/**
 * Código de impuesto (IVA, IRPF, IGIC, ReteFuente...): lo que guardan las
 * líneas y productos (copia del catálogo tax_rates, ver
 * db/models/taxRate.model.js). Sin < ni >: se pinta en listas e impresos.
 */
const taxCode = Joi.string().trim().min(1).max(20).pattern(/^[^<>]*$/)
  .messages({ 'string.pattern.base': 'El código no puede contener < ni >.' });

// Retención opcional de líneas y productos (vacía = sin retención)
const withholdingType = taxCode.allow(null, '');
const withholdingPercentage = Joi.number().min(0).max(100).precision(2).allow(null);

const id = Joi.number().integer().positive();

const rateFields = {
  code: taxCode,
  name: Joi.string().trim().min(2).max(80).pattern(/^[^<>]*$/)
    .messages({ 'string.pattern.base': 'El nombre no puede contener < ni >.' }),
  taxClass: Joi.string().valid(...TAX_CLASSES),
  percentage: Joi.number().min(0).max(100).precision(2),
  exemptionCause: Joi.string().valid(...EXEMPTION_CAUSES).allow(null, ''),
  isDefault: Joi.boolean(),
  active: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0).max(99999)
};

const createTaxRateSchema = Joi.object({
  ...rateFields,
  code: rateFields.code.required(),
  name: rateFields.name.required(),
  taxClass: rateFields.taxClass.required(),
  percentage: rateFields.percentage.required()
});

const updateTaxRateSchema = Joi.object(rateFields);

const getTaxRateSchema = Joi.object({ id: id.required() });

module.exports = {
  taxCode,
  withholdingType,
  withholdingPercentage,
  createTaxRateSchema,
  updateTaxRateSchema,
  getTaxRateSchema
};
