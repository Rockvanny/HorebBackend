const { ValidationError } = require('sequelize');
const logger = require('../libs/logger');

// Un registro por petición fallida. Sin cuerpo ni query string: pueden
// llevar contraseñas, códigos OTP o datos de clientes (?searchTerm=...).
function logErrors(err, req, res, next) {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  const statusCode = err.isBoom ? err.output.statusCode : (err.statusCode || 500);
  const userCode = req.user?.code ? ` [usuario ${req.user.code}]` : '';
  // Errores de Joi (validator.handler.js): el mensaje puede incluir el
  // valor recibido ('"phone" with value "..." fails...'); solo los campos.
  const message = Array.isArray(err.details)
    ? `validación fallida en ${[...new Set(err.details.map(d => d.path.join('.')))].join(', ')}`
    : err.message;
  const line = `${statusCode} ${req.method} ${path}${userCode}: ${message}`;

  // 4xx = petición rechazada (credenciales, permisos, validación): basta
  // una línea. 5xx = fallo nuestro: con stack para poder depurarlo.
  if (statusCode < 500) {
    logger.warn(line);
  } else {
    logger.error(line, { stack: err.stack || String(err) });
  }

  next(err);
}

function boomErrorHandler(err, req, res, next) {
  if (err.isBoom) {
    const { output } = err;
    return res.status(output.statusCode).json({
      success: false,
      ...output.payload
    });
  }
  next(err);
}

function ormErrorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message: err.name,
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  next(err);
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isDev = process.env.NODE_ENV === 'development';
  const statusCode = err.statusCode || 500;

  // Si llega hasta aquí es porque NO es un error boom ni una ValidationError
  // de Sequelize (esos ya se resolvieron antes, en boomErrorHandler /
  // ormErrorHandler, con una forma de respuesta consistente). Es un error no
  // controlado: un bug, una tabla inexistente, un fallo de conexión, etc.
  // El mensaje real (que puede incluir nombres de tabla, columnas, rutas de
  // fichero...) ya quedó a salvo en el log gracias a logErrors — al cliente,
  // en producción, solo le llega un mensaje genérico. Mantenemos la misma
  // forma de respuesta que boomErrorHandler (success/statusCode/error/message)
  // para que el frontend pueda tratar cualquier error con el mismo código.
  res.status(statusCode).json({
    success: false,
    statusCode,
    error: 'Internal Server Error',
    message: isDev ? (err.message || 'Internal Server Error') : 'Ha ocurrido un error interno. Inténtalo de nuevo más tarde.',
    stack: isDev ? err.stack : undefined,
  });
}

module.exports = { logErrors, boomErrorHandler, ormErrorHandler, errorHandler };
