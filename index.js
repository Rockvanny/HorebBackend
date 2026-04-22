// --- 0. CONFIGURACIÓN DE ZONA HORARIA ---
// Esto debe ser lo PRIMERO que se ejecute en toda la aplicación
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

const {
        logErrors,
        errorHandler,
        boomErrorHandler,
        ormErrorHandler
      } = require('./middlewares/error.handler');


const { Umzug, SequelizeStorage } = require('umzug');

const app = express();
const port = process.env.PORT || 3000;

// --- 1. CONFIGURACIÓN DE SEGURIDAD (PASSPORT) ---
passport.use(JwtStrategy);
app.use(passport.initialize());


// --- 2. MIDDLEWARES GLOBALES ---
// Configuración de CORS (para las rutas REST)
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
// Esto permite recibir cuerpos de mensaje grandes (ej: imágenes de productos o facturas)
app.use(express.json({ limit: '50mb' }));

// --- 3. RUTAS DE LA API ---
routerApi(app);

// --- 4. MIDDLEWARES DE ERROR (Deben ir después de las rutas) ---
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
// Ejecutar migraciones y luego iniciar el servidor
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida.');

    await migrator.up();
    console.log('✅ Migraciones aplicadas correctamente.');

    app.listen(port, () => {
      console.log(`🚀 Servidor iniciado en el puerto ${port}`);
    });
  } catch (error) {
    console.error('❌ Error al aplicar migraciones:', error);
  }
})();

module.exports = { sequelize, app };
