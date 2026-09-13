const { ValidationError } = require('sequelize');
const logger = require('../libs/logger'); // Importamos el logger que creamos

// Campos que nunca deben acabar en un log, aunque el request falle.
const SENSITIVE_BODY_FIELDS = ['password', 'otp', 'securityKey', 'token'];

function redactBody(body) {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };
  SENSITIVE_BODY_FIELDS.forEach((field) => {
    if (field in clone) clone[field] = '[REDACTED]';
  });
  return clone;
}

function logErrors(err, req, res, next) {
  // 1. Log en consola (solo para desarrollo, gestionado por winston)
  // 2. Log en archivo (persistente en AppData para producción)

  const errorInfo = {
    method: req.method,
    url: req.url,
    body: redactBody(req.body),
    stack: err.stack || 'No stack trace available'
  };

  // Usamos el logger profesional en lugar de console.error
  logger.error(`Error en ${req.method} ${req.url}: ${err.message}`, {
    stack: err.stack,
    metadata: errorInfo
  });

  // Si no hay stack (error plano), inspeccionamos manualmente para el log de consola
  if (!err.stack && process.env.NODE_ENV === 'development') {
    console.dir(err, { depth: null, colors: true });
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
