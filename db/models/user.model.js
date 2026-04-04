const { Model, DataTypes, Sequelize } = require('sequelize');

const USER_TABLE = 'users';

const UserSchema = {
  Userid: {
    field: 'user_id',
    allowNull: false,
    autoIncrement: false,
    primaryKey: true,
    type: DataTypes.STRING,
  },

  email: {
    field: 'email',
    allowNull: false,
    type: DataTypes.STRING,
    unique: true,
  },

  password: {
    field: 'password', // Corregido el typo de 'passwrod'
    allowNull: false,
    type: DataTypes.STRING,
  },

  role: {
    field: 'role',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'viewer', // Cambiado a 'viewer' según tu lógica de acceso
  },

  allowGestion: {
    field: 'allow_gestion',
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  allowSales: {
    field: 'allow_sales',
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  allowPurchases: {
    field: 'allow_purchases',
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  allowReports: {
    field: 'allow_reports',
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  allowSettings: {
    field: 'allow_settings',
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },

  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
}

class User extends Model {
  static associate(models) { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: USER_TABLE,
      modelName: 'User',
      timestamps: true,
      underscored: true
    }
  }
}

module.exports = { USER_TABLE, UserSchema, User }
