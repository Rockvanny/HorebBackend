const boom = require('@hapi/boom');

function validatorHandler(schema, property) {
  return (req, res, next) => {
    const data = req[property];
    const { error, value } = schema.validate(data, { abortEarly: false });
    if (error) {
      return next(boom.badRequest(error));
    }
    // Antes se descartaba 'value' y solo se comprobaba 'error': ningún
    // Joi.default(...) de ningún schema llegaba nunca a aplicarse -si el
    // llamador omitía un campo opcional con default, el service recibía
    // undefined/null en vez del valor por defecto (ej. postingDate quedaba
    // null en vez de la fecha de hoy). Con esto también se aplican las
    // coerciones de tipo de Joi (ej. limit/offset de query como number, no
    // string). Express 4: req.query/body/params son propiedades normales,
    // reasignables sin problema (en Express 5 req.query es solo-lectura).
    req[property] = value;
    next();
  }
}

module.exports = validatorHandler;
