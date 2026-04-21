const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

// Determinamos la ruta del log
// En producción: %APPDATA%/HOREB-ERP/logs/error.log
// En desarrollo: carpeta_del_backend/logs/error.log
const logDir = process.env.NODE_ENV === 'production'
    ? path.join(process.env.APPDATA, 'HOREB-ERP', 'logs')
    : path.join(__dirname, '../logs');

// Aseguramos que la carpeta exista
fs.ensureDirSync(logDir);

const logger = winston.createLogger({
    level: 'error', // Solo guardamos errores graves
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
        })
    ),
    transports: [
        // Guardar en archivo
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            maxsize: 5242880, // 5MB máximo por archivo
            maxFiles: 5,
        }),
        // Si estamos en desarrollo, también sacarlo por consola
        new winston.transports.Console({
            format: winston.format.simple(),
            silent: process.env.NODE_ENV === 'production'
        })
    ]
});

module.exports = logger;
