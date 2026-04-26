const Joi = require('joi');

const id = Joi.number().integer();
const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().precision(4);
const quantityUnitMeasure = Joi.number().precision(4).default(1);
const unitPrice = Joi.number().precision(4);

const taxType = Joi.string().valid('IVA', 'IRPF', 'RE', 'EXENTO').default('IVA');

const unitMeasure = Joi.string()
  .valid('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK')
  .default('UNIDAD');

const vat = Joi.number().min(0).max(100).precision(4).default(21);
const amountLine = Joi.number().precision(4);
const username = Joi.string().allow('', null);

const getSalesInvoiceLineSchema = Joi.object({
  id: id.required(),
});

const createSalesInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.optional().allow('', null),
  lineNo: lineNo.required(),
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure: quantityUnitMeasure.optional(),
  unitPrice: unitPrice.required(),
  taxType: taxType.optional(), // Agregado aquí
  vat: vat.optional(),
  amountLine: amountLine.required(),
  username: username.optional(),
});

const updateSalesInvoiceLineSchema = Joi.object({
  id: id.optional(),
  codeDocument: codeDocument.optional(),
  lineNo: lineNo.optional(),
  codeItem: codeItem.optional(),
  description: description.optional(),
  quantity: quantity.optional(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure: quantityUnitMeasure.optional(),
  unitPrice: unitPrice.optional(),
  taxType: taxType.optional(), // Agregado aquí
  vat: vat.optional(),
  amountLine: amountLine.optional(),
  username: username.optional(),
});

module.exports = {
  getSalesInvoiceLineSchema,
  createSalesInvoiceLineSchema,
  updateSalesInvoiceLineSchema,
  querySalesInvoiceLineSchema: Joi.object({
    limit: Joi.number().integer(),
    offset: Joi.number().integer(),
    searchTerm: Joi.string().allow('').optional()
  })
};
