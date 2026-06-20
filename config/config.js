const fs = require('fs');
const path = require('path');
require('dotenv').config();

const configPath = path.join(process.env.APPDATA || process.env.HOME, 'Hexivo', 'config.json');

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
        masterUser: process.env.MASTER_USER,
        masterPassword: process.env.MASTER_PASSWORD,
        jwtSecret: process.env.JWT_SECRET,
        aesSecret: process.env.AES_SECRET
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
