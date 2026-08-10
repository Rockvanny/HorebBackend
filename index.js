process.on('uncaughtException', (err) => {
    console.error('CRASH FATAL EN BACKEND:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('RECHAZO NO MANEJADO:', reason);
});

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
app.use(passport.initialize());
passport.use(JwtStrategy);

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
const migrationsPath = path.join(process.cwd(), 'db', 'migrations', '*.js');
const migrator = new Umzug({
  migrations: {
    glob: migrationsPath
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// --- 6. INICIO DEL SERVIDOR Y CONEXIÓN A BD ---
let server;

async function runSeed() {
  const { User } = sequelize.models;
  const count = await User.count();
  if (count === 0) {
    await User.create({
      code: 'admin',
      fullName: 'Administrador Maestro',
      email: 'admin@horeb.com',
      password: 'BdH0r3b2026', // ¡Asegúrate de hashear esto si tu modelo lo requiere!
      role: 'system',
      allowGestion: true,
      allowSales: true,
      allowPurchases: true,
      allowReports: true,
      allowSettings: true
    });
  }
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Base de datos conectada correctamente");

    await migrator.up();
    console.log("Migraciones ejecutadas con éxito");

    await runSeed();
    server = app.listen(port, () => {

      // --- LOGS DE INICIO SEGUROS Y LIMPIOS ---
        console.log("=== ESTADO DEL BACKEND ===");
        console.log(`Base de datos: ${process.env.DB_NAME || 'No definida'}`);
        console.log(`Puerto DB: ${process.env.DB_PORT || '5432'}`);
        console.log("==========================");

      console.log("SERVER_READY");
    });
  } catch (error) {
    console.error("ERROR CRÍTICO AL ARRANCAR O MIGRAR:", error);
    process.exit(1);
  }
})();

// --- 7. MANEJO DE CIERRE (Graceful Shutdown) ---
const gracefulShutdown = async (signal) => {
  if (server) {
    server.close(async () => {
      try {
        await sequelize.close();
        process.exit(0);
      } catch (err) {
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }

  // Forzar cierre si no termina en 3 segundos
  setTimeout(() => {
    process.exit(1);
  }, 3000);
};

// Escuchar señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { sequelize, app };
