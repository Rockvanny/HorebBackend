const express = require('express');
const passport = require('passport');
const MailAccountService = require('../services/mailAccount.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createMailAccountSchema } = require('../schemas/mailAccount.schema');

const router = express.Router();
const service = new MailAccountService();

// Cada usuario solo puede ver/tocar su propia cuenta de correo (buzón
// personal, ver decisión de producto en db/models/mailAccount.model.js), de
// ahí que no haya :id en las rutas ni checkAction por módulo.

router.get('/me',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const account = await service.findForUser(req.user.code);
      res.json(account);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/me',
  passport.authenticate('jwt', { session: false }),
  validatorHandler(createMailAccountSchema, 'body'),
  async (req, res, next) => {
    try {
      const account = await service.saveForUser(req.user.code, req.body);
      res.json(account);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/me',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const result = await service.deleteForUser(req.user.code);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
