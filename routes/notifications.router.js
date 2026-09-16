const express = require('express');
const passport = require('passport');
const NotificationsService = require('../services/notifications.service');
const validatorHandler = require('../middlewares/validator.handler');
const { queryNotificationsSchema, getNotificationSchema } = require('../schemas/notifications.schema');

const router = express.Router();
const service = new NotificationsService();

// Recursos ligados siempre a req.user.code (nunca se accede a las
// notificaciones de otro usuario), así que no hace falta pasar por
// checkAction/checkRole del sistema de permisos por módulo.

// El correo nuevo ya no se muestra en la campana: tiene su propio icono con
// su propio badge (ver GET /mail/unread-count en mail.router.js).
const BELL_EXCLUDED_TYPES = ['NEW_EMAIL'];

router.get('/unread-count',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const result = await service.unreadCount(req.user.code, { excludeTypes: BELL_EXCLUDED_TYPES });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/read-all',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const result = await service.markAllRead(req.user.code);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/',
  passport.authenticate('jwt', { session: false }),
  validatorHandler(queryNotificationsSchema, 'query'),
  async (req, res, next) => {
    try {
      // Genera (si corresponde) el aviso de cierre de mes antes de listar.
      // Es barato -solo BD-, así que se hace en cada listado sin cron.
      await service.ensureMonthEndReminders();

      const { limit, offset } = req.query;
      const onlyUnread = req.query.onlyUnread === 'true';
      const result = await service.findForUser(req.user.code, { limit, offset, onlyUnread, excludeTypes: BELL_EXCLUDED_TYPES });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/:id/read',
  passport.authenticate('jwt', { session: false }),
  validatorHandler(getNotificationSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await service.markRead(id, req.user.code);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
