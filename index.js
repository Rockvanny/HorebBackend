const express = require('express');
const sequelize = require('./libs/sequelize');
const cors = require('cors');
const routerApi = require('./routes');
const { logErrors, errorHandler, boomErrorHandler, ormErrorHandler } = require('./middlewares/error.handler');

const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuración de CORS (para las rutas REST)
const whitelist = ['http://localhost:8080', 'https://myapp.co'];
const options = {
  origin: (origin, callback) => {
    if (whitelist.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('no permitido'));
    }
  }
};

app.use(cors(options));
app.use(express.json({ limit: '50mb' }));
app.use(express.json());

// Mantener las rutas organizadas en `routes/`
routerApi(app);

app.use(logErrors);
app.use(ormErrorHandler);
app.use(boomErrorHandler);
app.use(errorHandler);

//TODO console.log('🔍 Variables de entorno:');
//TODO console.log('DB_NAME:', `"${process.env.DB_NAME}"`);
//TODO console.log('DB_USER:', `"${process.env.DB_USER}"`);
//TODO console.log('DB_PASSWORD:', `"${process.env.DB_PASSWORD}"`);
//TODO console.log('DB_HOST:', `"${process.env.DB_HOST}"`);
//TODO console.log('DB_PORT:', `"${process.env.DB_PORT}"`);

// Configuración de Sequelize y Umzug para migraciones
/*const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
  }
);*/

const migrator = new Umzug({
  migrations: {
    glob: path.join(__dirname, 'db/migrations/*.js'),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

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
