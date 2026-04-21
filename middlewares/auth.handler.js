const boom = require('@hapi/boom');

function checkRole(...roles) {
  return (req, res, next) => {
    const user = req.user;
    if (user && roles.includes(user.role)) {
      next();
    } else {
      next(boom.forbidden('Tu rol no tiene permiso para esta acción'));
    }
  };
}

function checkPermission(permissionField) {
  return async (req, res, next) => {
    try {
      const user = req.user; // Obtenido del JWT validado

      if (!user) {
        return next(boom.unauthorized('Se requiere una sesión activa'));
      }

      // 1. REGLA DE ORO: El Maestro tiene permiso para TODO lo que intente abrir.
      // (Aunque en el login solo le demos settings, el middleware le permite pasar si es master)
      if (user.role === 'master' || user.isMaster === true) {
        return next();
      }

      // 2. VERIFICACIÓN PARA USUARIOS NORMALES
      // Buscamos el permiso en el objeto user (inyectado desde el token)
      if (user[permissionField] === true || (user.permissions && user.permissions[permissionField] === true)) {
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
