const { ValidationError } = require('sequelize');

function logErrors(err, req, res, next) {
  console.error('--- [INICIO ERROR LOG] ---');

  if (err.stack) {
    // Si es un error estándar de JS o Boom
    console.error(`[Stack Trace]:`, err.stack);
  } else {
    // Si el error es un objeto plano o undefined, lo inspeccionamos a fondo
    console.error(`[Error detectado sin Stack]:`);
    console.dir(err, { depth: null, colors: true });

    // Si es un objeto de Joi o similar, intentamos stringificarlo
    try {
      console.error(`[JSON Detail]:`, JSON.stringify(err, null, 2));
    } catch (e) {
      console.error(`[Raw Value]:`, err);
    }
  }

  console.error('--- [FIN ERROR LOG] ---');
  next(err);
}

function boomErrorHandler(err, req, res, next) {
  if (err.isBoom) {
    const { output } = err;
    // IMPORTANTE: Si respondemos aquí, NO llamamos a next(err)
    return res.status(output.statusCode).json({
        success: false,
        ...output.payload
    });
  }
  next(err);
}

function ormErrorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    // 409 Conflict es ideal para violaciones de integridad/validación de ORM
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
  // Si llegamos aquí y ya se envió cabecera (por algún error previo), abortamos
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

module.exports = { logErrors, boomErrorHandler, ormErrorHandler, errorHandler };
