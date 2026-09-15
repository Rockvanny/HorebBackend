const { Model, DataTypes } = require('sequelize');

const NOTIFICATIONS_TABLE = 'notifications';

// Centro de notificaciones genérico (campana en el frontend). `type` empieza
// con solo dos valores porque son los únicos orígenes implementados hoy; para
// añadir uno nuevo (ej. tareas asignadas) hay que migrar el ENUM, igual que
// se hizo con vendor.category (ver 20260914195102-align_vendor_category_enum.js).
const NotificationSchema = {
  id: {
    field: 'id',
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },

  // FK "blanda" a users.code (mismo patrón que operatingExpenses.userName).
  recipientUser: {
    field: 'recipient_user',
    type: DataTypes.STRING,
    allowNull: false,
  },

  type: {
    field: 'type',
    type: DataTypes.ENUM('MONTH_END_REMINDER', 'NEW_EMAIL'),
    allowNull: false,
  },

  title: {
    field: 'title',
    type: DataTypes.STRING,
    allowNull: false,
  },

  message: {
    field: 'message',
    type: DataTypes.TEXT,
    allowNull: false,
  },

  // Contexto opcional para que el frontend sepa a qué pantalla navegar al
  // hacer clic (ej. 'operatingExpenses', 'mailbox').
  link: {
    field: 'link',
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Evita duplicados: p.ej. "MONTH_END_REMINDER:2026-09" o "NEW_EMAIL:123".
  // Único junto a (recipientUser, type) — ver migración.
  dedupeKey: {
    field: 'dedupe_key',
    type: DataTypes.STRING,
    allowNull: false,
  },

  isRead: {
    field: 'is_read',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },

  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE
  },

  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE
  }
};

class Notification extends Model {
  static associate(models) { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: NOTIFICATIONS_TABLE,
      modelName: 'Notification',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { Notification, NotificationSchema, NOTIFICATIONS_TABLE };
