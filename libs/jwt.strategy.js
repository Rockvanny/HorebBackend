const { Strategy, ExtractJwt } = require('passport-jwt');
const { config } = require('../config/config');

const options = {
  // Extrae el token del Header 'Authorization: Bearer <token>'
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  // La misma clave que usaste para firmar
  secretOrKey: config.jwtSecret || 'secret_key',
};

const JwtStrategy = new Strategy(options, (payload, done) => {
  // El 'payload' es el objeto que metimos en el login (sub, role, permissions)
  // Passport inyectará esto en req.user
  return done(null, payload);
});

module.exports = JwtStrategy;
