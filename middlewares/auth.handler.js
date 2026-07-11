const boom = require('@hapi/boom');
const { checkPermission } = require('../config/access-manager');

/**
 * Middleware para validar acciones específicas
 * @param {string} actionString - Ej: 'DELETE_CLIENTES', 'VIEW_VENTAS'
 */
function checkAction(actionString) {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return next(boom.unauthorized('Se requiere una sesión activa'));
      }

      // Si checkPermission es síncrono, puedes quitar el 'await'.
      // Si quieres dejarlo por seguridad, asegúrate de que checkPermission devuelva una Promesa.
      const isAllowed = checkPermission(user, actionString);

      if (isAllowed) {
        return next();
      }

      // Registro de seguridad: útil para detectar intentos de acceso indebido
      console.warn(`[SECURITY ALERT] Usuario ${user.id} intentó acceder a ${actionString}`);

      next(boom.forbidden(`Acceso denegado a la acción: ${actionString}`));

    } catch (error) {
      console.error(`[MIDDLEWARE ERROR] Falló checkAction para ${actionString}:`, error);
      next(boom.internal('Error interno al verificar permisos'));
    }
  };
}

/**
 * Middleware para validar roles
 */
function checkRole(...roles) {
  return (req, res, next) => {
    // 1. Normalización: extraemos el rol del usuario y lo pasamos a minúsculas
    const userRole = (req.user?.role || '').toLowerCase();

    // 2. Normalización de los roles permitidos: pasamos todos a minúsculas
    const allowedRoles = roles.map(r => r.toLowerCase());

    // 3. Validación
    if (req.user && allowedRoles.includes(userRole)) {
      next();
    } else {
      // Usamos boom para un error 403 consistente
      next(boom.forbidden('Tu rol no tiene permiso para este recurso'));
    }
  };
}

// Mantenemos tus exports intactos
module.exports = { checkAction, checkRole };
