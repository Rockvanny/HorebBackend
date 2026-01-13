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
    field: 'passwrod',
    allowNull: false,
    type: DataTypes.STRING,
  },

  role: {
    field: 'role',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'customer',
  },

  createdAt: {
    field: 'create_at',
    allowNull: false,
    type: DataTypes.DATE
  },

  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE
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
