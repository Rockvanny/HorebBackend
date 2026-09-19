const { Strategy, ExtractJwt } = require('passport-jwt');
const { getConfig } = require('../config/config');

// Estrategia SEPARADA de jwt.strategy.js (empleados): un token de cliente
// (payload.type === 'CUSTOMER') nunca debe autenticar contra rutas de
// empleado ni al revés. Se registra con el nombre 'customer-jwt' en index.js
// -las rutas de incidencias/autoservicio la piden explícitamente con
// passport.authenticate('customer-jwt', ...)-, así que un token de empleado
// (sin ese payload.type) tampoco funciona aquí.
const CustomerService = require('../services/customers.service');
const service = new CustomerService();

const config = getConfig();

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
};

const CustomerJwtStrategy = new Strategy(options, async (payload, done) => {
  try {
    if (payload.type !== 'CUSTOMER') return done(null, false);

    const customer = await service.findOne(payload.sub);
    // Revalidado en cada petición (no solo al hacer login): si el personal
    // interno revoca el acceso mientras el cliente ya tiene un token de 8h
    // vigente, deja de poder usar la app de inmediato en vez de esperar a
    // que expire.
    if (!customer.appAccessEnabled) return done(null, false);
    return done(null, customer);
  } catch (error) {
    // findOne lanza boom.notFound si el cliente ya no existe (ej. borrado
    // después de emitido el token) - no es un fallo real del servidor, solo
    // "este token ya no vale".
    if (error.isBoom && error.output?.statusCode === 404) return done(null, false);
    return done(error, false);
  }
});

module.exports = CustomerJwtStrategy;
