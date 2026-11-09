const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

// Ruta del log: logs/error.log dentro de la app. En Docker esa carpeta es un
// volumen del host (ver docker-compose.yml), así sobrevive a los rebuild.
const logDir = process.env.NODE_ENV === 'production'
  ? path.join(process.cwd(), 'logs')
  : path.join(__dirname, '../logs');

// Aseguramos que la carpeta exista
try {
  fs.ensureDirSync(logDir);
} catch (err) {
  console.error("No se pudo crear la carpeta de logs:", err);
}

// Niveles usados:
//   error -> fallo inesperado (5xx, excepción): con stack, para depurar.
//   warn  -> petición rechazada (4xx: login fallido, permiso denegado,
//            validación) o servicio externo caído: una línea, sin stack.
// Nada de info/debug: el log solo debe tener lo que sirve para rastrear un
// problema. Nunca registres cuerpos de petición, tokens, contraseñas,
// códigos OTP ni datos personales (correo, NIF...): usa el código del
// usuario o del registro.
const logger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // Mensaje (qué petición/servicio) y, debajo, el stack si lo hay. Antes
    // el stack sustituía al mensaje y se perdía la ruta que falló.
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? `\n${stack}` : ''}`;
    })
  ),
  transports: [
    // Guardar en archivo
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      maxsize: 5242880, // 5MB máximo por archivo
      maxFiles: 5,
    }),
    // Consola también en producción: en Docker es lo que muestra
    // `docker compose logs backend`. Antes estaba silenciada en producción
    // y los errores solo quedaban en un archivo dentro del contenedor.
    new winston.transports.Console()
  ]
});

module.exports = logger;
