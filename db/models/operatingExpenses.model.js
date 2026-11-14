const { Model, DataTypes, Sequelize } = require('sequelize');
const { categoryAttribute } = require('./expenseCategory.model');

const OPERATING_EXPENSES_TABLE = 'operating_expenses';

const OperatingExpensesSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },

  date: {
    field: 'date',
    allowNull: false,
    type: DataTypes.DATEONLY
  },

  // Nombre de una categoría de gasto (tabla expense_categories, editable
  // en Configuración; ver db/models/expenseCategory.model.js).
  category: categoryAttribute(),

  // A quién apunta entityCode: un proveedor (vendors.code) o un empleado
  // (employees.employee_no, nóminas). Los gastos de empleados solo los ven
  // los administradores (ver operatingExpenses.service.js).
  entityType: {
    field: 'entity_type',
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'vendor',
    validate: { isIn: [['vendor', 'employee']] }
  },

  entityCode: {
    field: 'entity_code',
    type: DataTypes.STRING,
    allowNull: false,
  },

  // Gasto de AJUSTE: id del gasto cerrado que corrige y motivo (ver
  // operatingExpenses.service.js#correct). null en los gastos normales.
  correctsId: {
    field: 'corrects_id',
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  correctionReason: {
    field: 'correction_reason',
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  name: {
    field: 'name',
    type: DataTypes.STRING,
    allowNull: false
  },

  nif: {
    field: 'nif',
    type: DataTypes.STRING,
    allowNull: false
  },

  concept: {
    field: 'concept',
    type: DataTypes.STRING,
    allowNull: false,
  },

  baseAmount: {
    field: 'base_amount',
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  tax: {
    field: 'tax_%',
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },

  taxAmount: {
    field: 'tax_amount',
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },

  irpf: {
    field: 'irpf_%',
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  amountIrpf: {
    field: 'amount_irpf',
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },

  totalAmount: {
    field: 'total_amount',
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },

  paymentMethod: {
    field: 'payment_method',
    type: Sequelize.DataTypes.ENUM(
      'Transferencia',
      'Efectivo',
      'Tarjeta',
      'Bizum',
    ),
    allowNull: false,
    defaultValue: 'Transferencia'
  },

  isValidated: {
    field: 'is_validated',
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },

  userName: {
    field: 'user_name',
    type: DataTypes.STRING,
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

class OperatingExpenses extends Model {
  static associate(models) {
    // Si en el futuro vinculas gastos a proyectos, lo añadirías aquí
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: OPERATING_EXPENSES_TABLE,
      modelName: 'OperatingExpenses',
      timestamps: true,
      underscored: true,

      hooks: {
        beforeValidate: async (instance, options) => {
          // 1. ASIGNACIÓN DE USUARIO (Si se pasa en las opciones del Service)
          if (options.user) {
            instance.username = options.user;
          }
        }
      }
    }
  }
}

module.exports = { OperatingExpenses, OperatingExpensesSchema, OPERATING_EXPENSES_TABLE };
