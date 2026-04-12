const boom = require('@hapi/boom');
const { models } = require('./../libs/sequelize');
const { config } = require('../config/config'); // Importante para reconocer al master

// OPCIÓN A: Verificar por ROL (admin, master, etc)
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

/**
 * Middleware ajustado para soportar al Usuario Maestro Virtual
 */
function checkPermission(permissionField) {
  return async (req, res, next) => {
    try {
      let user = req.user;
      const headerUserId = req.headers['user-id'];

      // 1. SI NO HAY USUARIO EN REQ, LO BUSCAMOS
      if (!user && headerUserId) {

        // CAPA MAESTRA: Si el ID coincide con el del config, creamos el usuario virtual
        if (headerUserId === config.masterUser) {
          user = {
            userId: config.masterUser,
            username: config.masterUser,
            role: 'master',
            fullName: 'Soporte Horeb',
            isMaster: true
          };
        } else {
          // CAPA DB: Si no es el maestro, buscamos en la base de datos normalmente
          user = await models.User.findByPk(headerUserId);
        }

        // Asignamos a req.user para que esté disponible en controladores/servicios
        req.user = user;
      }

      // 2. VALIDAMOS EXISTENCIA
      if (!user) {
        return next(boom.unauthorized('Se requiere una sesión activa o User-ID válido'));
      }

      // 3. REGLA DE ORO: El Maestro tiene permiso para TODO, siempre.
      if (user.role === 'master' || user.isMaster === true) {
        return next();
      }

      // 4. VERIFICACIÓN NORMAL PARA USUARIOS DE BASE DE DATOS
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
