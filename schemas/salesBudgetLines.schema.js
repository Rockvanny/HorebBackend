const Joi = require('joi');

const codeDocument = Joi.string();
const lineNo = Joi.number().integer().min(1);
const codeItem = Joi.string().allow('', null);
const description = Joi.string().allow('', null);
const quantity = Joi.number().min(0).precision(4);
const unitPrice = Joi.number().min(0).precision(4);

// PRODUCTO: línea normal con cantidad/precio. COMENTARIO: solo texto libre
// en 'description' — el resto de campos no aplica (ver
// requiredUnlessComment más abajo y libs/taxCalculation.js, que no suma
// estas líneas a los totales).
const type = Joi.string().valid('PRODUCTO', 'COMENTARIO').default('PRODUCTO');

// Envuelve un schema para que solo sea obligatorio si la línea es de tipo
// PRODUCTO (por defecto, si 'type' no viene en el payload). Usado en el
// schema de creación; en actualización estos campos ya eran opcionales de
// por sí.
const requiredUnlessComment = (schema) =>
  schema.when('type', { is: 'COMENTARIO', then: Joi.optional().allow(null), otherwise: Joi.required() });

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
// guardar, así que nunca llega null a una columna NOT NULL. Una línea
// COMENTARIO nunca los exige, sea cual sea unitMeasure.
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

const getSalesBudgetLineSchema = Joi.object({
  codeDocument: codeDocument.required(),
  lineNo: lineNo.required(),
});

const createSalesBudgetLineSchema = Joi.object({
  codeDocument: codeDocument.optional().allow('', null),
  lineNo: lineNo.required(),
  type: type.optional(),
  codeItem: codeItem.optional(),
  description: description.required(),
  quantity: requiredUnlessComment(quantity),
  unitMeasure: unitMeasure.optional(),
  quantityUnitMeasure,
  width,
  height,
  unitPrice: requiredUnlessComment(unitPrice),
  taxType: taxType.optional(), // <-- Agregado
  vat: vat.optional(),
  amountLine: amountLine.required(),
  username: username.optional(),
});

const updateSalesBudgetLineSchema = Joi.object({
  codeDocument: codeDocument.optional(),
  lineNo: lineNo.optional(),
  type: type.optional(),
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
