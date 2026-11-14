const Joi = require('joi');
const { ID_TYPES, PERSON_TYPES, TAX_REGIMES, DEPARTMENTS, nitCheckDigit } = require('../libs/colombia');

/**
 * Validación de los campos propios de Colombia (co_*, ver libs/colombia.js
 * y db/models/colombiaFields.js). Todos opcionales: una instalación de
 * España no los manda y sus esquemas siguen validando igual que antes.
 */
const optional = (schema) => schema.allow('', null);

const colombiaPartyFields = {
  coPersonType: optional(Joi.string().valid(...Object.keys(PERSON_TYPES))),
  coIdType: optional(Joi.string().valid(...Object.keys(ID_TYPES))),
  coIdNumber: optional(Joi.string().trim().pattern(/^[0-9A-Za-z]{3,20}$/)
    .messages({ 'string.pattern.base': 'El número de documento solo puede llevar números y letras, sin puntos ni guiones.' })),
  coCheckDigit: optional(Joi.string().pattern(/^\d$/)),
  coDepartment: optional(Joi.string().valid(...Object.keys(DEPARTMENTS))),
  coMunicipality: optional(Joi.string().trim().max(80)),
  coTaxRegime: optional(Joi.string().valid(...Object.keys(TAX_REGIMES)))
};

const { coIdType, coIdNumber, coDepartment, coMunicipality } = colombiaPartyFields;
const colombiaPersonFields = { coIdType, coIdNumber, coDepartment, coMunicipality };

/** Con NIT, el dígito de verificación tiene que cuadrar (algoritmo DIAN) */
const checkNit = (value, helpers) => {
  if (value.coIdType === 'NIT' && value.coIdNumber) {
    const expected = nitCheckDigit(value.coIdNumber);
    if (String(expected) !== String(value.coCheckDigit ?? '')) {
      return helpers.message({ custom: `El dígito de verificación del NIT ${value.coIdNumber} es ${expected}.` });
    }
  }
  return value;
};

/**
 * Campos de España (NIF, código postal...) que en una ficha colombiana no
 * se usan: si la ficha trae el número de documento colombiano dejan de ser
 * obligatorios (vacío en BD si la columna no admite nulos); si no, se
 * validan exactamente como siempre.
 */
const unlessColombian = (spanishSchema) => Joi.when('coIdNumber', {
  is: Joi.string().min(1).required(),
  then: Joi.string().allow('', null).default(''),
  otherwise: spanishSchema
});

module.exports = { colombiaPartyFields, colombiaPersonFields, checkNit, unlessColombian };
