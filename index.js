// --- 0. CONFIGURACIÓN DE ZONA HORARIA ---
process.env.TZ = 'Europe/Madrid';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const path = require('path');

// Importación de librerías internas
const sequelize = require('./libs/sequelize');
const JwtStrategy = require('./libs/jwt.strategy');
const routerApi = require('./routes');
const { logErrors, errorHandler, boomErrorHandler, ormErrorHandler } = require('./middlewares/error.handler');
const { Umzug, SequelizeStorage } = require('umzug');

const app = express();
const port = process.env.PORT || 3000;

// --- 1. CONFIGURACIÓN DE SEGURIDAD (PASSPORT) ---
passport.use(JwtStrategy);
app.use(passport.initialize());

// --- 2. MIDDLEWARES GLOBALES ---
const whitelist = ['http://localhost:8080'];
const corsOptions = {
  origin: (origin, callback) => {
    if (whitelist.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Acceso no permitido por política de CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// --- 3. RUTAS DE LA API ---
routerApi(app);

// --- 4. MIDDLEWARES DE ERROR ---
app.use(logErrors);
app.use(ormErrorHandler);
app.use(boomErrorHandler);
app.use(errorHandler);

// --- 5. CONFIGURACIÓN DE MIGRACIONES (UMZUG) ---
const migrator = new Umzug({
  migrations: {
    glob: path.join(__dirname, 'db/migrations/*.js'),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// --- 6. INICIO DEL SERVIDOR Y CONEXIÓN A BD ---
let server;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida.');

    await migrator.up();
    console.log('Migraciones aplicadas correctamente.');

    server = app.listen(port, () => {
      console.log(`Servidor iniciado en el puerto ${port}`);
      console.log("SERVER_READY");
    });
  } catch (error) {
    console.error('Error al aplicar migraciones:', error);
  }
})();

// --- 7. MANEJO DE CIERRE GRACIOSO (Graceful Shutdown) ---
const gracefulShutdown = async (signal) => {
  console.log(`Recibida señal ${signal}. Cerrando servidor...`);

  if (server) {
    server.close(async () => {
      console.log('Servidor HTTP cerrado.');
      try {
        await sequelize.close();
        console.log('Conexión a BD cerrada.');
        process.exit(0);
      } catch (err) {
        console.error('Error cerrando BD:', err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }

  // Forzar cierre si no termina en 3 segundos
  setTimeout(() => {
    console.error('Forzando cierre por tiempo límite.');
    process.exit(1);
  }, 3000);
};

// Escuchar señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { sequelize, app };
