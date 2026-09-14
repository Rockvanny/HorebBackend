const Joi = require('joi');

const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().min(0).precision(4);
const unitPrice = Joi.number().min(0).precision(4);

const taxType = Joi.string()
  .valid('IVA', 'IRPF', 'RE', 'EXENTO')
  .default('IVA');

const unitMeasure = Joi.string()
  .valid('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK')
  .default('UNIDAD');

const vat = Joi.number().min(0).max(100).precision(4).default(21);
const amountLine = Joi.number().min(0).precision(4);
const username = Joi.string().allow('', null);

// Cada campo dimensional solo importa (y solo es obligatorio) según la
// unidad de medida elegida: quantityUnitMeasure para METRO (factor lineal),
// width/height para METRO2 (superficie). Para el resto de unidades
// (UNIDAD, HORA, DIA, SERVICIO, KILOGRAMO, LITRO, PACK) se aceptan vacíos
// (el front los manda a null, ver transactionLinesHandler.js#getLinesData)
// y libs/taxCalculation.js los normaliza a su valor por defecto antes de
// guardar, así que nunca llega null a una columna NOT NULL.
const quantityUnitMeasure = Joi.number().min(0).precision(4)
  .when('unitMeasure', { is: 'METRO', then: Joi.required(), otherwise: Joi.optional().allow(null) });

const width = Joi.number().min(0).precision(4)
  .when('unitMeasure', { is: 'METRO2', then: Joi.required(), otherwise: Joi.optional().allow(null) });

const height = Joi.number().min(0).precision(4)
  .when('unitMeasure', { is: 'METRO2', then: Joi.required(), otherwise: Joi.optional().allow(null) });

const getSalesBudgetLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
});

const createSalesBudgetLineSchema = Joi.object({
  codeDocument: codeDocument.optional().allow('', null),
  lineNo: lineNo.required(),
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure,
  width,
  height,
  unitPrice: unitPrice.required(),
  taxType: taxType.optional(), // <-- Agregado
  vat: vat.optional(),
  amountLine: amountLine.required(),
  username: username.optional(),
});

const updateSalesBudgetLineSchema = Joi.object({
  codeDocument: codeDocument.optional(),
  lineNo: lineNo.optional(),
  codeItem: codeItem.optional(),
  description: description.optional(),
  quantity: quantity.optional(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure,
  width,
  height,
  unitPrice: unitPrice.optional(),
  taxType: taxType.optional(), // <-- Agregado
  vat: vat.optional(),
  amountLine: amountLine.optional(),
  username: username.optional(),
});

const querySalesBudgetLineSchema = Joi.object({
  limit: Joi.number().integer(),
  offset: Joi.number().integer(),
  searchTerm: Joi.string().allow('').optional(),
});

module.exports = {
  getSalesBudgetLineSchema,
  createSalesBudgetLineSchema,
  updateSalesBudgetLineSchema,
  querySalesBudgetLineSchema
};
