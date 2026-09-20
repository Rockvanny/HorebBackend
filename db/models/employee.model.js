const { Model, DataTypes, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

const EMPLOYEE_TABLE = 'employees';

// Identidad separada de 'users' a propósito (decidido con el usuario
// 2026-09-20): Users es el flujo de escritorio (Frontend Electron),
// Employees es el flujo de la app móvil (Android) -mismo criterio que ya
// separa Customer de todo lo demás-. Sin vínculo en BD entre un Employee y
// un User: si la misma persona necesita ambos accesos, se da de alta dos
// veces, con credenciales propias en cada sitio. Mismos 6 roles que User
// (ROLES en access-manager.js) para no romper el checkRole('admin'/
// 'operario'/'vendedor'...) ya usado en tasks/buildings/operatingExpenses/
// salesBudgets -pero SIN los flags allowGestion/allowSales/etc: esos son
// del sistema de módulos del Frontend (checkAction), que Employee no usa
// -toda la autorización móvil es por rol, ver checkRole-.
const EmployeeSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING,
  },

  fullName: {
    field: 'full_name',
    allowNull: false,
    type: DataTypes.STRING,
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
    defaultValue: true,
  },

  role: {
    field: 'role',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'operario',
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
};

class Employee extends Model {
  static associate(models) { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: EMPLOYEE_TABLE,
      modelName: 'Employee',
      timestamps: true,
      underscored: true,
      hooks: {
        // Mismo generador de 'code' que User (iniciales + apellido, con
        // contador si colisiona), namespaces independientes -un Employee y
        // un User pueden compartir el mismo code sin conflicto, son tablas
        // separadas-.
        beforeValidate: async (employee, options) => {
          if (employee.fullName && !employee.code) {
            const parts = employee.fullName.trim().toLowerCase().split(' ');
            const firstName = parts[0];
            const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
            let baseId = lastName ? (firstName[0] + lastName) : firstName;

            baseId = baseId.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

            let finalId = baseId;
            let counter = 1;
            let exists = true;

            while (exists) {
              const duplicate = await Employee.findOne({
                where: { code: finalId },
                transaction: options.transaction
              });

              if (duplicate) {
                finalId = `${baseId}${counter}`;
                counter++;
              } else {
                exists = false;
              }
            }
            employee.code = finalId;
          }
        },

        beforeCreate: async (employee) => {
          if (employee.password) {
            employee.password = await bcrypt.hash(employee.password, 10);
          }
        },

        beforeUpdate: async (employee) => {
          if (employee.changed('password')) {
            employee.password = await bcrypt.hash(employee.password, 10);
          }
        }
      }
    };
  }
}

module.exports = { EMPLOYEE_TABLE, EmployeeSchema, Employee };
