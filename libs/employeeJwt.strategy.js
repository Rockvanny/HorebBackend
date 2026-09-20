const { Strategy, ExtractJwt } = require('passport-jwt');
const { getConfig } = require('../config/config');

// Estrategia SEPARADA de jwt.strategy.js (Users, flujo de escritorio) y de
// customerJwt.strategy.js: un token de empleado (payload.type === 'EMPLOYEE')
// nunca debe autenticar contra rutas de usuario de escritorio ni de cliente,
// ni al revés. Se registra con el nombre 'employee-jwt' en index.js -las
// rutas móviles (tasks, operatingExpenses/mobile-summary,
// salesBudgets/mobile-projects) la piden explícitamente con
// passport.authenticate('employee-jwt', ...)-. Decidido con el usuario
// 2026-09-20: Users = app de escritorio (Frontend Electron), Employees =
// app móvil (Android), identidades totalmente independientes -sin FK entre
// ambas tablas-.
const EmployeesService = require('../services/employees.service');
const service = new EmployeesService();

const config = getConfig();

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
};

const EmployeeJwtStrategy = new Strategy(options, async (payload, done) => {
  try {
    if (payload.type !== 'EMPLOYEE') return done(null, false);

    const employee = await service.findOne(payload.sub);
    return done(null, employee);
  } catch (error) {
    // findOne lanza boom.notFound si el empleado ya no existe (ej. borrado
    // después de emitido el token) - no es un fallo real del servidor, solo
    // "este token ya no vale".
    if (error.isBoom && error.output?.statusCode === 404) return done(null, false);
    return done(error, false);
  }
});

module.exports = EmployeeJwtStrategy;
