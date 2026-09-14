const Joi = require('joi');

const id = Joi.number().integer();
const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
// Línea de presupuesto de origen, si se insertó desde el selector de líneas
// pendientes (ver routes/salesBudgetLines.router.js#/:codeDocument/pending).
const budgetLineNo = Joi.number().integer().allow(null);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().precision(4);
const unitPrice = Joi.number().precision(4);

// PRODUCTO: línea normal con cantidad/precio. COMENTARIO: solo texto libre
// en 'description' — el resto de campos no aplica (ver
// requiredUnlessComment más abajo y libs/taxCalculation.js, que no suma
// estas líneas a los totales).
const type = Joi.string().valid('PRODUCTO', 'COMENTARIO').default('PRODUCTO');

// Envuelve un schema para que solo sea obligatorio si la línea es de tipo
// PRODUCTO (por defecto, si 'type' no viene en el payload).
const requiredUnlessComment = (schema) =>
  schema.when('type', { is: 'COMENTARIO', then: Joi.optional().allow(null), otherwise: Joi.required() });

const taxType = Joi.string().valid('IVA', 'IRPF', 'RE', 'EXENTO').default('IVA');

const unitMeasure = Joi.string()
  .valid('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK')
  .default('UNIDAD');

const vat = Joi.number().min(0).max(100).precision(4).default(21);
const amountLine = Joi.number().precision(4);
const username = Joi.string().allow('', null);

// Mismo criterio que salesBudgetLines.schema.js: quantityUnitMeasure solo
// importa para METRO, width/height solo para METRO2, y ninguno de los tres
// se exige nunca en una línea COMENTARIO. El resto de unidades los mandan a
// null (ver transactionLinesHandler.js#getLinesData) y
// libs/taxCalculation.js los normaliza antes de guardar.
const quantityUnitMeasure = Joi.number().min(0).precision(4)
  .when('type', {
    is: 'COMENTARIO',
    then: Joi.optional().allow(null),
    otherwise: Joi.when('unitMeasure', { is: 'METRO', then: Joi.required(), otherwise: Joi.optional().allow(null) })
  });

const width = Joi.number().min(0).precision(4)
  .when('type', {
    is: 'COMENTARIO',
    then: Joi.optional().allow(null),
    otherwise: Joi.when('unitMeasure', { is: 'METRO2', then: Joi.required(), otherwise: Joi.optional().allow(null) })
  });

const height = Joi.number().min(0).precision(4)
  .when('type', {
    is: 'COMENTARIO',
    then: Joi.optional().allow(null),
    otherwise: Joi.when('unitMeasure', { is: 'METRO2', then: Joi.required(), otherwise: Joi.optional().allow(null) })
  });

const getSalesInvoiceLineSchema = Joi.object({
  id: id.required(),
});

const createSalesInvoiceLineSchema = Joi.object({
  codeDocument: codeDocument.optional().allow('', null),
  lineNo: lineNo.required(),
  type: type.optional(),
  budgetLineNo: budgetLineNo.optional(),
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: requiredUnlessComment(quantity),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure,
  width,
  height,
  unitPrice: requiredUnlessComment(unitPrice),
  taxType: taxType.optional(), // Agregado aquí
  vat: vat.optional(),
  amountLine: amountLine.required(),
  username: username.optional(),
});

const updateSalesInvoiceLineSchema = Joi.object({
  id: id.optional(),
  codeDocument: codeDocument.optional(),
  lineNo: lineNo.optional(),
  type: type.optional(),
  budgetLineNo: budgetLineNo.optional(),
  codeItem: codeItem.optional(),
  description: description.optional(),
  quantity: quantity.optional(),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure,
  width,
  height,
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
