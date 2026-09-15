const { Model, DataTypes } = require('sequelize');

const MAIL_ACCOUNTS_TABLE = 'mail_accounts';

// Cuenta de correo IMAP personal de cada usuario (ej. buzón de Hostalia),
// usada por la pantalla de Bandeja de Correo. Una por usuario.
const MailAccountSchema = {
  id: {
    field: 'id',
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },

  // FK "blanda" a users.code, igual que operatingExpenses.userName.
  userCode: {
    field: 'user_code',
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  email: {
    field: 'email',
    type: DataTypes.STRING,
    allowNull: false,
  },

  imapHost: {
    field: 'imap_host',
    type: DataTypes.STRING,
    allowNull: false,
  },

  imapPort: {
    field: 'imap_port',
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 993,
  },

  imapSecure: {
    field: 'imap_secure',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },

  // Usuario de login IMAP (en Hostalia suele ser el email con "@" por ".").
  username: {
    field: 'username',
    type: DataTypes.STRING,
    allowNull: false,
  },

  // Cifrado en reposo con libs/crypto.js (AES-256-GCM), igual que
  // verifactuConfig.apiSecret. Nunca se expone en claro por la API.
  passwordEncrypted: {
    field: 'password_encrypted',
    type: DataTypes.TEXT,
    allowNull: false,
  },

  // UID IMAP más alto visto hasta ahora en INBOX, para detectar mensajes
  // nuevos sin tener que releer todo el buzón (ver services/mail.service.js).
  lastSeenUid: {
    field: 'last_seen_uid',
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  lastCheckedAt: {
    field: 'last_checked_at',
    type: DataTypes.DATE,
    allowNull: true,
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

class MailAccount extends Model {
  static associate(models) { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: MAIL_ACCOUNTS_TABLE,
      modelName: 'MailAccount',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { MailAccount, MailAccountSchema, MAIL_ACCOUNTS_TABLE };
