const fs = require('fs');
const path = require('path');
require('dotenv').config();

const configPath = path.join(process.env.APPDATA || process.env.HOME, 'Hexivo', 'config.json');

// Clave pública para verificar licencias (RS256). Es pública a propósito: no
// firma nada, solo verifica, así que puede vivir en el repo sin riesgo.
const licensePublicKeyPath = path.join(__dirname, 'license-public-key.pem');
const licensePublicKey = fs.existsSync(licensePublicKeyPath)
    ? fs.readFileSync(licensePublicKeyPath, 'utf8')
    : null;

// Función que calcula la URL de la base de datos
const getDbUrl = (data) => {
    return `postgres://${data.dbUser}:${data.dbPassword}@${data.dbHost}:${data.dbPort}/${data.dbName}`;
};

// Función para obtener la configuración unificada
const getConfig = () => {
    let configData = {
        dbUser: process.env.DB_USER,
        dbPassword: process.env.DB_PASSWORD,
        dbHost: process.env.DB_HOST,
        dbName: process.env.DB_NAME,
        dbPort: process.env.DB_PORT,
        jwtSecret: process.env.JWT_SECRET,
        aesSecret: process.env.AES_SECRET,

        // Envío de email transaccional (OTP de login, notificaciones)
        resendApiKey: process.env.RESEND_API_KEY,
        mailFrom: process.env.MAIL_FROM || 'Hexivo Control <no-reply@hexivocontrol.com>',

        // Parámetros del OTP de login (segundo factor)
        otpExpirationMinutes: parseInt(process.env.OTP_EXPIRATION_MINUTES, 10) || 5,
        otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5,
        otpResendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 10) || 45,
        otpMaxResends: parseInt(process.env.OTP_MAX_RESENDS, 10) || 3,

        // Licencia / suscripción
        licensePublicKey,
        trialDurationDays: parseInt(process.env.TRIAL_DURATION_DAYS, 10) || 15,
    };

    if (fs.existsSync(configPath)) {
        try {
            const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            configData = { ...configData, ...userConfig };
        } catch (e) {
            console.error("Error leyendo config.json, usando valores por defecto.");
        }
    }

    configData.id = 1;
    configData.dbUrl = getDbUrl(configData);

    // Fail-fast: sin JWT_SECRET no arrancamos con un secreto público conocido.
    if (!configData.jwtSecret) {
        throw new Error(
            'JWT_SECRET no está configurado. Defínelo en las variables de entorno ' +
            '(o en el fichero de configuración local) antes de arrancar el backend.'
        );
    }

    return configData;
};

// Función para actualizar el archivo JSON
const updateConfig = (newChanges) => {
    const currentConfig = getConfig();
    const updatedConfig = { ...currentConfig, ...newChanges };

    // Filtramos solo lo necesario para no guardar todo en el JSON
    const dataToSave = {
        dbUser: updatedConfig.dbUser,
        dbPassword: updatedConfig.dbPassword,
        dbHost: updatedConfig.dbHost,
        dbName: updatedConfig.dbName,
        dbPort: updatedConfig.dbPort
    };

    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(configPath, JSON.stringify(dataToSave, null, 2));
};

module.exports = { getConfig, updateConfig, configPath };
