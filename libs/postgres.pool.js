const { Pool } = require('pg');
 const { getConfig } = require('./../config/config');

 const config = getConfig();
 const USER = encodeURIComponent(config.dbUser);
 const PASSWORD = encodeURIComponent(config.dbPassword);
 const  URI = `postgres://${USER}:${PASSWORD}@${config.dbHost}:${config.dbPort}/${config.dbName}`

const pool = new Pool({connectionString: URI});

module.exports = pool;
