const { Sequelize } = require('sequelize');
const { config } = require('./../config/config');
const setupModels = require('./../db/models');

const USER = encodeURIComponent(config.dbUser);
const PASSWORD = encodeURIComponent(config.dbPassword);
const URI = `postgres://${USER}:${PASSWORD}@${config.dbHost}:${config.dbPort}/${config.dbName}`;

const sequelize = new Sequelize(URI, {
  dialect: 'postgres',
  // SOLUCIÓN AL WARNING [SEQUELIZE0002]:
  // Cambiamos 'true' por una función anónima para que use la nueva sintaxis.
  logging: (msg) => console.log(msg),

  define: {
    hooks: {
      beforeSave: (instance, options) => {
        if (options.userExecutor) {
          // IMPORTANTE: Asegúrate de que el modelo tenga 'username' definido
          // o usa instance.set('username', value) para mayor seguridad.
          instance.username = options.userExecutor;
        }
      }
    }
  }
});

setupModels(sequelize);

module.exports = sequelize;
