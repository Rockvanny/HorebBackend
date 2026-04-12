const { Sequelize } = require('sequelize');
const { config } = require('./../config/config');
const setupModels = require('./../db/models');

const USER = encodeURIComponent(config.dbUser);
const PASSWORD = encodeURIComponent(config.dbPassword);
const URI = `postgres://${USER}:${PASSWORD}@${config.dbHost}:${config.dbPort}/${config.dbName}`;

const sequelize = new Sequelize(URI, {
  dialect: 'postgres',
  logging: true,
  /**
   * CONFIGURACIÓN DE HOOKS GLOBALES
   * Estos hooks se ejecutarán en TODOS los modelos definidos.
   */
  define: {
    hooks: {
      // beforeSave cubre tanto 'beforeCreate' como 'beforeUpdate'
      beforeSave: (instance, options) => {
        // 'userExecutor' es una propiedad que pasaremos en las opciones del query
        if (options.userExecutor) {
          // Asignamos el nombre del usuario al campo 'username' del modelo
          // Asegúrate de que tus modelos tengan este campo definido.
          instance.username = options.userExecutor;
        }
      }
    }
  }
});

setupModels(sequelize);

module.exports = sequelize;
