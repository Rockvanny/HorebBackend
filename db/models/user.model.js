const { Model, DataTypes, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const USER_TABLE = 'users';

const UserSchema = {
  // Identificador de login (Ej: 'dayala')
  code: {
    field: 'user_id',
    allowNull: false,
    autoIncrement: false,
    primaryKey: true,
    type: DataTypes.STRING,
  },

  // --- NUEVO CAMPO: Nombre y Apellidos ---
  fullName: {
    field: 'full_name',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'Usuario Nuevo'
  },

  email: {
    field: 'email',
    allowNull: false,
    type: DataTypes.STRING,
    unique: true,
    validate: { isEmail: true }
  },

  password: {
    field: 'password',
    allowNull: false,
    type: DataTypes.STRING,
  },

  mustChangePassword: {
    field: 'must_change_password',
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: true, // Siempre true al crear
  },

  role: {
    field: 'role',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'viewer',
  },

  // Mapeo de módulos (coinciden con la lógica del access-manager)
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
      underscored: true,
      hooks: {
        beforeValidate: async (user, options) => {
          // 1. Lógica de generación de userId (Solo si no viene uno)
          if (user.fullName && !user.userId) {
            const parts = user.fullName.trim().toLowerCase().split(' ');
            const firstName = parts[0];
            const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
            let baseId = lastName ? (firstName[0] + lastName) : firstName;
            baseId = baseId.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

            let finalId = baseId;
            let counter = 1;
            let exists = true;

            while (exists) {
              const duplicate = await User.findOne({
                where: { userId: finalId },
                transaction: options.transaction
              });

              if (duplicate) {
                finalId = `${baseId}${counter}`;
                counter++;
              } else {
                exists = false;
              }
            }
            user.userId = finalId;
          }

          // 2. ENCRIPTACIÓN (Fuera del IF para que SIEMPRE se ejecute)
          if (user.password) {
            const hash = await bcrypt.hash(user.password, 10);
            user.password = hash;
          }
        },

        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            const hash = await bcrypt.hash(user.password, 10);
            user.password = hash;
          }
        }
      }
    }
  }
}

module.exports = { USER_TABLE, UserSchema, User };
