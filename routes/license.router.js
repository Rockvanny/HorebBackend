const express = require('express');
const passport = require('passport');
const LicenseService = require('../services/license.service');
const validatorHandler = require('../middlewares/validator.handler');
const { activateLicenseSchema } = require('../schemas/license.schema');

const router = express.Router();
const service = new LicenseService();

// Estas rutas están exentas de la puerta de licencia (ver
// middlewares/licenseGate.js): si no, nadie podría activar una licencia
// nueva una vez caducado el trial. Sí exigen sesión iniciada.

router.get('/status',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const status = await service.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/fingerprint',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json({ success: true, data: { fingerprint: service.getFingerprint() } });
  }
);

router.post('/activate',
  passport.authenticate('jwt', { session: false }),
  validatorHandler(activateLicenseSchema, 'body'),
  async (req, res, next) => {
    try {
      const license = await service.activateLicense(req.body.licenseToken);
      res.json({ success: true, data: license });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
