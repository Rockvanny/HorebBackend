const boom = require('@hapi/boom');
const { models } = require('./../libs/sequelize');

// OPCIÓN A: Verificar por ROL (admin, master, etc)
function checkRole(...roles) {
  return (req, res, next) => {
    const user = req.user; // Esto funcionará cuando pongamos JWT
    if (user && roles.includes(user.role)) {
      next();
    } else {
      next(boom.forbidden('Tu rol no tiene permiso para esta acción'));
    }
  };
}

/**
 * Middleware para verificar permisos específicos en Horeb.
 * @param {string} permissionField - El nombre del campo booleano (ej: 'allowSettings')
 */
function checkPermission(permissionField) {
  return async (req, res, next) => {
    try {
      // 1. Intentamos obtener el usuario de la sesión (cuando ya tengamos JWT activo)
      // 2. Si no hay sesión, buscamos el ID en los headers (para tus pruebas actuales en Postman)
      let user = req.user;
      const headerUserId = req.headers['user-id'];

      if (!user && headerUserId) {
        user = await models.User.findByPk(headerUserId);
      }

      // Si después de ambas comprobaciones no hay usuario...
      if (!user) {
        return next(boom.unauthorized('Se requiere una sesión activa o User-ID válido'));
      }

      // 3. Verificamos el permiso en el objeto usuario
      // IMPORTANTE: Asegúrate de que 'user' tenga el campo buscado
      if (user[permissionField] === true) {
        next();
      } else {
        next(boom.forbidden(`Acceso denegado: No tienes habilitado el permiso '${permissionField}'`));
      }
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { checkRole, checkPermission };
