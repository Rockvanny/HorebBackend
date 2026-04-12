require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'dev',
  port: process.env.PORT || 3000,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  dbHost: process.env.DB_HOST,
  dbName: process.env.DB_NAME,
  dbPort: process.env.DB_PORT,
  // Asegúrate de que los nombres en process.env sean los mismos que en tu archivo .env
  dbUrl: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,

  masterUser: process.env.MASTER_USER,
  masterPassword: process.env.MASTER_PASSWORD,
  jwtSecret: process.env.JWT_SECRET,
}

module.exports = { config };
