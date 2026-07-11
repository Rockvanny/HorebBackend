const passport = require('passport');
const { checkAction } = require('../middlewares/auth.handler');
const validatorHandler  = require('../middlewares/validator.handler');

/**
 * Factory para generar un stack de middlewares estándar.
 * @param {string} action - El string de permiso (ej: 'UPDATE_COMPANY').
 * @param {Object} schemas - Objeto con los esquemas { body, params, query }.
 */
const protectedRoute = (action, schemas = {}) => {
  const middlewareStack = [
    // 1. Autenticación (siempre necesaria en tus rutas protegidas)
    passport.authenticate('jwt', { session: false }),
    // 2. Autorización (Nivel 1 y 2 según tu access-manager)
    checkAction(action)
  ];

  // 3. Validación de parámetros (ej: :id)
  if (schemas.params) {
    middlewareStack.push(validatorHandler(schemas.params, 'params'));
  }

  // 4. Validación del cuerpo (ej: datos de creación/actualización)
  if (schemas.body) {
    middlewareStack.push(validatorHandler(schemas.body, 'body'));
  }

  // 5. Validación de queries (si hiciera falta)
  if (schemas.query) {
    middlewareStack.push(validatorHandler(schemas.query, 'query'));
  }

  return middlewareStack;
};

module.exports = { protectedRoute };
