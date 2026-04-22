const express = require('express');
const fs = require('fs');
const path = require('path');
const passport = require('passport'); // 1. Importar Passport
const { checkPermission } = require('../middlewares/auth.handler'); // 2. Importar checkPermission

const router = express.Router();
const envPath = path.resolve(process.cwd(), '.env');

/**
 * LEER VARIABLES DEL ARCHIVO .env
 * Solo accesible para administradores (Settings)
 */
router.get('/',
  passport.authenticate('jwt', { session: false }), // 3. Autenticación obligatoria
  checkPermission('allowSettings'), // 4. Máximo nivel de permiso
  (req, res, next) => {
    try {
      if (!fs.existsSync(envPath)) {
        return res.status(404).json({ message: 'Archivo .env no encontrado.' });
      }

      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');

      const config = {};
      lines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('='); // Por si el valor contiene un '='
        if (key && value) {
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
      next(error);
    }
  }
);

/**
 * ACTUALIZAR EL ARCHIVO .env
 */
router.put('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSettings'),
  (req, res, next) => {
    const { host, port, user, password, dbName } = req.body;

    if (!host || !port || !user || !dbName) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    try {
      if (!fs.existsSync(envPath)) {
        // Si no existe, lo creamos vacío para poder escribir
        fs.writeFileSync(envPath, '', 'utf-8');
      }

      let envContent = fs.readFileSync(envPath, 'utf-8');

      const updateEnv = (key, value) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const quotedValue = `'${value}'`;
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}=${quotedValue}`);
        } else {
          // Aseguramos que haya un salto de línea antes si el archivo no está vacío
          const prefix = envContent && !envContent.endsWith('\n') ? '\n' : '';
          envContent += `${prefix}${key}=${quotedValue}`;
        }
      };

      updateEnv('DB_HOST', host);
      updateEnv('DB_PORT', port);
      updateEnv('DB_USER', user);

      // Solo actualizamos la contraseña si el usuario envía algo
      if (password && password !== '') {
        updateEnv('DB_PASSWORD', password);
      }

      updateEnv('DB_NAME', dbName);

      fs.writeFileSync(envPath, envContent, 'utf-8');

      res.json({ message: 'Archivo .env actualizado correctamente.' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
