const { Strategy, ExtractJwt } = require('passport-jwt');
const { getConfig } = require('../config/config');

// 🔥 1. Importa tu servicio de usuarios (Ajusta la ruta según tu estructura de carpetas)
const UserService = require('../services/user.service');
const service = new UserService();

const config = getConfig();

const options = {
  // Extrae el token del Header 'Authorization: Bearer <token>'
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  // La misma clave que usaste para firmar
  secretOrKey: config.jwtSecret,
};

// 🔥 2. Transformamos la función en ASÍNCRONA (async)
const JwtStrategy = new Strategy(options, async (payload, done) => {
  try {
    // Un token de Customer o Employee lleva payload.type ('CUSTOMER'/
    // 'EMPLOYEE'); uno de User (desktop) lleva 'USER' desde ahora, o ningún
    // 'type' si es un token antiguo emitido antes de este cambio (se acepta
    // igual, por compatibilidad, hasta que caduque en máximo 8h). Sin esta
    // comprobación, un Employee con el mismo code que un User (ambos
    // generan el code igual, por iniciales del nombre) colaba aquí como si
    // fuera ese User -mismo secreto de firma para las tres identidades-.
    // Encontrado probando la separación Users/Employees (2026-09-20).
    if (payload.type && payload.type !== 'USER') return done(null, false);

    // El 'payload.sub' suele contener el ID del usuario que guardaste al firmar el token.
    // Si en tu login guardaste otra propiedad, asegúrate de usar esa (ej: payload.id)
    const user = await service.findOne(payload.sub);

    if (!user) {
      // Si el usuario ya no existe en la BD, denegamos el acceso
      return done(null, false);
    }

    // 🔥 3. Passport inyectará el usuario COMPLETO y REAL de la BD en req.user
    // Ahora req.user tendrá .code, .allowGestion, etc.
    return done(null, user);

  } catch (error) {
    // Si hay un fallo de conexión o base de datos, Passport lo captura aquí
    return done(error, false);
  }
});

module.exports = JwtStrategy;
