const { Model, DataTypes, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const { generateNextCode } = require('../../libs/sequence.handler');

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
//
// Desde 2026-11 el empleado es también una ficha como cliente/proveedor:
// 'employeeNo' sale de una serie (tipo 'employee') y es el número que se ve
// en la aplicación y en las nóminas de gastos operativos. 'code' (jperez)
// sigue siendo la clave y la identidad de la app móvil (login, OTP, tareas
// asignadas): no se renumera nunca. Un empleado puede existir sin acceso a
// la app (appAccess false, solo para nóminas): sin email ni contraseña.
const EmployeeSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING,
  },

  employeeNo: {
    field: 'employee_no',
    allowNull: true,
    unique: true,
    type: DataTypes.STRING,
  },

  // Serie elegida en el alta (no se guarda, ver generateNextCode)
  selectedSerie: {
    type: DataTypes.VIRTUAL,
  },

  fullName: {
    field: 'full_name',
    allowNull: false,
    type: DataTypes.STRING,
  },

  email: {
    field: 'email',
    allowNull: true,
    type: DataTypes.STRING,
    unique: true,
    validate: { isEmail: true }
  },

  password: {
    field: 'password',
    allowNull: true,
    type: DataTypes.STRING,
  },

  appAccess: {
    field: 'app_access',
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  // --- Datos personales ---
  phone: { field: 'phone', allowNull: true, type: DataTypes.STRING },
  documentType: { field: 'document_type', allowNull: true, type: DataTypes.STRING(20) },
  documentNumber: { field: 'document_number', allowNull: true, type: DataTypes.STRING(30) },
  address: { field: 'address', allowNull: true, type: DataTypes.STRING },
  postCode: { field: 'post_code', allowNull: true, type: DataTypes.STRING(10) },
  city: { field: 'city', allowNull: true, type: DataTypes.STRING },
  province: { field: 'province', allowNull: true, type: DataTypes.STRING },

  // --- Datos laborales ---
  jobTitle: { field: 'job_title', allowNull: true, type: DataTypes.STRING },
  hireDate: { field: 'hire_date', allowNull: true, type: DataTypes.DATEONLY },
  terminationDate: { field: 'termination_date', allowNull: true, type: DataTypes.DATEONLY },

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
          // Nº de empleado de la serie elegida, solo en el alta
          if (employee.isNewRecord && !employee.employeeNo) {
            await generateNextCode(employee, options, 'employeeNo');
          }

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
          if (employee.changed('password') && employee.password) {
            employee.password = await bcrypt.hash(employee.password, 10);
          }
        }
      }
    };
  }
}

module.exports = { EMPLOYEE_TABLE, EmployeeSchema, Employee };
