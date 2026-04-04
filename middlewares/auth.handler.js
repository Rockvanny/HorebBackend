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

// OPCIÓN B: Verificar por PERMISO (allowSales, allowSettings, etc)
// Esta es la que necesitas para tu tabla de usuarios actual
function checkPermission(permissionField) {
  return async (req, res, next) => {
    try {
      // Leemos el ID desde los headers para pruebas (Postman)
      const userId = req.headers['user-id'];

      if (!userId) {
        return next(boom.unauthorized('Se requiere User-ID en los headers'));
      }

      const user = await models.User.findByPk(userId);

      if (!user) {
        return next(boom.notFound('Usuario no encontrado'));
      }

      // Verificamos el booleano (ej: user.allowSettings)
      if (user[permissionField] === true) {
        next();
      } else {
        next(boom.forbidden(`No tienes habilitado el permiso: ${permissionField}`));
      }
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { checkRole, checkPermission };
