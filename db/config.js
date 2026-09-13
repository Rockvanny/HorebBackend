const { getConfig } = require('./../config/config');
const config = getConfig();

module.exports = {
  development: {
    url: config.dbUrl,
    dialect: 'postgres',
  },

  production: {
    url: config.dbUrl,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false
      }
    }
  }
}
