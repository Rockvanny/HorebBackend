const { Model, DataTypes, Sequelize } = require('sequelize');

const LOGIN_OTP_TABLE = 'login_otps';

const LoginOtpSchema = {
  id: {
    field: 'id',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4
  },

  userCode: {
    field: 'user_code',
    allowNull: false,
    type: DataTypes.STRING,
  },

  purpose: {
    field: 'purpose',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'LOGIN_2FA'
  },

  codeHash: {
    field: 'code_hash',
    allowNull: false,
    type: DataTypes.STRING,
  },

  attempts: {
    field: 'attempts',
    allowNull: false,
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  maxAttempts: {
    field: 'max_attempts',
    allowNull: false,
    type: DataTypes.INTEGER,
    defaultValue: 5
  },

  resendCount: {
    field: 'resend_count',
    allowNull: false,
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  maxResends: {
    field: 'max_resends',
    allowNull: false,
    type: DataTypes.INTEGER,
    defaultValue: 3
  },

  expiresAt: {
    field: 'expires_at',
    allowNull: false,
    type: DataTypes.DATE,
  },

  consumedAt: {
    field: 'consumed_at',
    allowNull: true,
    type: DataTypes.DATE,
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

class LoginOtp extends Model {
  static associate(models) {
    this.belongsTo(models.User, {
      as: 'user',
      foreignKey: 'userCode',
      targetKey: 'code'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: LOGIN_OTP_TABLE,
      modelName: 'LoginOtp',
      timestamps: true,
      underscored: true,
    };
  }
}

module.exports = { LoginOtp, LoginOtpSchema, LOGIN_OTP_TABLE };
