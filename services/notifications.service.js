const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const { getMonthEndReviewStatus } = require('../libs/monthClose.helper');

/**
 * Centro de notificaciones (campana del frontend). No hay cron: cada origen
 * se genera bajo demanda cuando el frontend consulta (ver routes/notifications.router.js
 * y routes/mail.router.js), apoyándose en la restricción única de la tabla
 * para no duplicar avisos ya creados.
 */
class NotificationsService {
  async findForUser(userCode, { limit = 20, offset = 0, onlyUnread = false } = {}) {
    const parsedLimit = parseInt(limit, 10) || 20;
    const parsedOffset = parseInt(offset, 10) || 0;

    const where = { recipientUser: userCode };
    if (onlyUnread) where.isRead = false;

    const { count, rows } = await models.Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset: parsedOffset,
    });

    return {
      records: rows,
      total: count,
      hasMore: (parsedOffset + rows.length) < count,
    };
  }

  async unreadCount(userCode) {
    const count = await models.Notification.count({ where: { recipientUser: userCode, isRead: false } });
    return { count };
  }

  async markRead(id, userCode) {
    const notification = await models.Notification.findOne({ where: { id, recipientUser: userCode } });
    if (!notification) throw boom.notFound('Notificación no encontrada');
    if (!notification.isRead) await notification.update({ isRead: true });
    return notification;
  }

  async markAllRead(userCode) {
    await models.Notification.update(
      { isRead: true },
      { where: { recipientUser: userCode, isRead: false } }
    );
    return { success: true };
  }

  /**
   * Inserta una notificación si no existe ya una igual (misma
   * recipientUser + type + dedupeKey). Se apoya en la restricción única de
   * la tabla en vez de comprobar antes, para que sea idempotente incluso con
   * llamadas concurrentes.
   */
  async #createIfMissing({ recipientUser, type, title, message, link, dedupeKey }) {
    try {
      await models.Notification.create({ recipientUser, type, title, message, link, dedupeKey });
    } catch (error) {
      if (error.name !== 'SequelizeUniqueConstraintError') throw error;
    }
  }

  /**
   * Aviso de cierre de mes para cada admin: solo si quedan 1-2 días
   * laborables para fin de mes (ver libs/monthClose.helper.js) y hay gastos
   * operativos del mes en curso sin validar. Barato (solo BD), se puede
   * llamar en cada listado de notificaciones sin problema.
   */
  async ensureMonthEndReminders() {
    const { withinReminderWindow, businessDaysRemaining } = getMonthEndReviewStatus();
    if (!withinReminderWindow) return;

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const pendingCount = await models.OperatingExpenses.count({
      where: {
        date: { [Op.between]: [firstDay, lastDay] },
        isValidated: false,
      },
    });
    if (!pendingCount) return;

    const admins = await models.User.findAll({ where: { role: 'admin' } });
    if (!admins.length) return;

    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dayWord = businessDaysRemaining === 1 ? 'día laborable' : 'días laborables';
    const gastoWord = pendingCount === 1 ? 'gasto operativo sin validar' : 'gastos operativos sin validar';

    await Promise.all(admins.map((admin) => this.#createIfMissing({
      recipientUser: admin.code,
      type: 'MONTH_END_REMINDER',
      title: 'Revisa los gastos antes del cierre de mes',
      message: `Quedan ${businessDaysRemaining} ${dayWord} para el cierre del mes. Hay ${pendingCount} ${gastoWord}.`,
      link: 'operatingExpenses',
      dedupeKey: `MONTH_END_REMINDER:${monthKey}`,
    })));
  }

  /**
   * Convierte mensajes nuevos detectados por IMAP (ver mail.service.js) en
   * notificaciones. dedupeKey por UID evita duplicados si se llama dos veces
   * sobre la misma detección.
   */
  async createNewMailNotifications(userCode, newMessages = []) {
    await Promise.all(newMessages.map((msg) => this.#createIfMissing({
      recipientUser: userCode,
      type: 'NEW_EMAIL',
      title: 'Correo nuevo',
      message: `${msg.from || 'Remitente desconocido'}: ${msg.subject}`,
      link: 'mailbox',
      dedupeKey: `NEW_EMAIL:${msg.uid}`,
    })));
  }
}

module.exports = NotificationsService;
