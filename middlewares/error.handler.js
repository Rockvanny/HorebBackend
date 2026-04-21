const { ValidationError } = require('sequelize');
const logger = require('../libs/logger'); // Importamos el logger que creamos

function logErrors(err, req, res, next) {
  // 1. Log en consola (solo para desarrollo, gestionado por winston)
  // 2. Log en archivo (persistente en AppData para producción)

  const errorInfo = {
    method: req.method,
    url: req.url,
    body: req.body,
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

  const statusCode = err.statusCode || 500;

  // En producción, nunca enviamos el stack al cliente por seguridad,
  // pero el stack ya quedó guardado de forma segura en nuestro archivo .log gracias a logErrors
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = { logErrors, boomErrorHandler, ormErrorHandler, errorHandler };
