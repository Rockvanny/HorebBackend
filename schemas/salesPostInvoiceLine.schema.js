const Joi = require('joi');
const { taxCode, withholdingType, withholdingPercentage } = require('./taxRate.schema');

const id = Joi.number().integer();
const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().precision(4);
const quantityUnitMeasure = Joi.number().precision(4).default(1);
const unitPrice = Joi.number().precision(4);

// Código de impuesto del catálogo editable (ver taxRate.schema.js)
const taxType = taxCode.default('IVA');

const unitMeasure = Joi.string()
  .valid('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK', 'ML')
  .default('UNIDAD');

const vat = Joi.number().min(0).max(100).precision(4).default(21);
const amountLine = Joi.number().precision(4);
const username = Joi.string().allow('', null);
const type = Joi.string().valid('PRODUCTO', 'COMENTARIO').default('PRODUCTO');

const getSalesPostInvoiceLineSchema = Joi.object({
  id: id.optional(),
  codeDocument: codeDocument.optional(),
  lineNo: lineNo.optional(),
}).or('id', 'codeDocument');

const createSalesPostInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
  type: type.optional(),
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.required(),
  quantityUnitMeasure: quantityUnitMeasure.required(),
  unitPrice: unitPrice.required(),
  taxType: taxType.required(), // Ahora es requerido para el histórico oficial
  vat: vat.required(),
  withholdingType,
  withholdingPercentage,
  amountLine: amountLine.required(),
  username: username.optional(),
});

const querySalesPostInvoiceLineSchema = Joi.object({
  limit: Joi.number().integer(),
  offset: Joi.number().integer(),
  searchTerm: Joi.string().allow('').optional()
});

module.exports = {
  getSalesPostInvoiceLineSchema,
  createSalesPostInvoiceLineSchema,
  querySalesPostInvoiceLineSchema
};
