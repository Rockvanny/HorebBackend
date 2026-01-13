const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const envPath = path.resolve(process.cwd(), '.env');

// Leer variables del archivo .env
router.get('/', (req, res) => {
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    const config = {};
    lines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        // Elimina comillas simples y dobles
        const cleanValue = value.trim().replace(/^['"]|['"]$/g, '');
        config[key.trim()] = cleanValue;
      }
    });

    res.json({
      host: config.DB_HOST || '',
      port: config.DB_PORT || '',
      user: config.DB_USER || '',
      password: config.DB_PASSWORD || '',
      dbName: config.DB_NAME || ''
    });
  } catch (error) {
    console.error('Error al leer .env:', error);
    res.status(500).json({ message: 'Error al leer archivo .env.' });
  }
  });

// Actualizar el archivo .env
router.put('/', (req, res) => {
  const { host, port, user, password, dbName } = req.body;
  console.log('Nuevos datos:', host, port, user, password, dbName);

  if (!host || !port || !user || !dbName) {
    return res.status(400).json({ message: 'Faltan campos obligatorios.' });
  }

  try {
    let envContent = fs.readFileSync(envPath, 'utf-8');

    const updateEnv = (key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const quotedValue = `'${value}'`; // conserva las comillas
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${quotedValue}`);
      } else {
        envContent += `\n${key}=${quotedValue}`;
      }
    };

    updateEnv('DB_HOST', host);
    updateEnv('DB_PORT', port);
    updateEnv('DB_USER', user);

    if (password != '') {
      updateEnv('DB_PASSWORD', password);
    }

    updateEnv('DB_NAME', dbName);

    fs.writeFileSync(envPath, envContent, 'utf-8');

    res.json({ message: 'Archivo .env actualizado correctamente.' });
  } catch (error) {
    console.error('Error al actualizar .env:', error);
    res.status(500).json({ message: 'Error al escribir archivo .env.' });
  }
});

module.exports = router;
