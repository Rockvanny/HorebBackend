const Joi = require('joi');

// ===============================================
// 1. DEFINICIÓN DE ATRIBUTOS INDIVIDUALES
// ===============================================
const id = Joi.number().integer();
const codeDocument = Joi.string(); // Simetría con SalesPostInvoiceLine
const lineNo = Joi.number().integer();
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('');
const quantity = Joi.number();
const unitMeasure = Joi.string().valid(
  'UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO',
  'METRO2', 'KILOGRAMO', 'LITRO', 'PACK'
);
const quantityUnitMeasure = Joi.number();
const unitPrice = Joi.number().precision(4);
const taxType = Joi.string().valid('IVA', 'IRPF', 'RE', 'EXENTO');
const vat = Joi.number().precision(4);
const amountLine = Joi.number().precision(4);
const userName = Joi.string(); // camelCase para simetría

const limit = Joi.number().integer();
const offset = Joi.number().integer();

// ===============================================
// 2. ESQUEMAS DE VALIDACIÓN
// ===============================================

// Obtener una línea específica (normalmente por ID)
const getPurchPostInvoiceLineSchema = Joi.object({
  id: id.required(),
});

// Crear registro en histórico (Bulk insert desde el servicio)
const createPurchPostInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: quantity.required(),
  unitMeasure: unitMeasure.default('UNIDAD'),
  quantityUnitMeasure: quantityUnitMeasure.default(1),
  unitPrice: unitPrice.required(),
  taxType: taxType.default('IVA'),
  vat: vat.required(),
  amountLine: amountLine.required(),
  userName: userName.optional(),
});

// Consulta de líneas
const queryPurchPostInvoiceLineSchema = Joi.object({
  limit,
  offset
});

module.exports = {
  getPurchPostInvoiceLineSchema,
  createPurchPostInvoiceLineSchema,
  queryPurchPostInvoiceLineSchema
};
