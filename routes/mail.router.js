const express = require('express');
const passport = require('passport');
const MailService = require('../services/mail.service');
const MailAccountService = require('../services/mailAccount.service');
const NotificationsService = require('../services/notifications.service');
const validatorHandler = require('../middlewares/validator.handler');
const { queryMailSchema, getMailMessageSchema } = require('../schemas/mailAccount.schema');

const router = express.Router();
const mailService = new MailService();
const mailAccountService = new MailAccountService();
const notificationsService = new NotificationsService();

router.get('/inbox',
  passport.authenticate('jwt', { session: false }),
  validatorHandler(queryMailSchema, 'query'),
  async (req, res, next) => {
    try {
      const account = await mailAccountService.getRawForUser(req.user.code);
      const limit = parseInt(req.query.limit, 10) || 25;
      const offset = parseInt(req.query.offset, 10) || 0;
      const result = await mailService.fetchInbox(account, { limit, offset });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/messages/:uid',
  passport.authenticate('jwt', { session: false }),
  validatorHandler(getMailMessageSchema, 'params'),
  async (req, res, next) => {
    try {
      const account = await mailAccountService.getRawForUser(req.user.code);
      const message = await mailService.fetchMessage(account, parseInt(req.params.uid, 10));
      res.json(message);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Disparado bajo demanda desde el frontend (no hay cron): revisa si hay
 * mensajes nuevos desde el último `lastSeenUid` y los convierte en
 * notificaciones de la campana.
 */
router.post('/check-new',
  passport.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const account = await mailAccountService.getRawForUser(req.user.code);
      const { newMessages, newLastSeenUid } = await mailService.checkNewMessages(account);

      if (newLastSeenUid !== account.lastSeenUid) {
        await mailAccountService.updateLastSeenUid(req.user.code, newLastSeenUid);
      }
      if (newMessages.length) {
        await notificationsService.createNewMailNotifications(req.user.code, newMessages);
      }

      res.json({ newCount: newMessages.length });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
