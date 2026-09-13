const express = require('express');
const UserService = require('../services/user.service');
const LicenseService = require('../services/license.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createFirstAdminSchema } = require('../schemas/setup.schema');
const { models } = require('../libs/sequelize');

const router = express.Router();
const service = new UserService();
const licenseService = new LicenseService();

// Sin autenticación a propósito: es el arranque de una instalación nueva,
// antes de que exista ningún usuario. Ambas rutas están exentas de la
// puerta de licencia (ver middlewares/licenseGate.js).

/**
 * Endpoint de arranque: el frontend lo llama UNA vez al abrir la app, antes
 * de decidir qué pantalla mostrar (login normal, asistente de primer admin,
 * o aviso de licencia/prueba caducada). Ver contrato completo en SEGURIDAD.md.
 */
router.get('/status',
  async (req, res, next) => {
    try {
      const count = await models.User.count();
      const license = await licenseService.getStatus();
      res.json({ success: true, data: { needsSetup: count === 0, license } });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/first-admin',
  validatorHandler(createFirstAdminSchema, 'body'),
  async (req, res, next) => {
    try {
      const admin = await service.createFirstAdmin(req.body);
      res.status(201).json({ success: true, data: admin });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
