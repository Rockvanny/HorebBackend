const boom = require('@hapi/boom');

function validatorHandler(schema, property) {
  //TODO console.log("MiddelWare: ", schema, property);
  return (req, res, next) => {
    const data = req[property];
    const { error } = schema.validate(data, { abortEarly: false });
    if (error) {
      //TODO console.error('Error de validación (detalles):', error.details);
      // ¡CAMBIO AQUÍ! Añade un 'return' para salir de la función
      return next(boom.badRequest(error));
    }
    next();
  }
}

module.exports = validatorHandler;
