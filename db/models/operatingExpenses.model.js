const { Model, DataTypes, Sequelize } = require('sequelize');

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

  category: {
    field: 'category',
    type: DataTypes.ENUM(// Aunque son gastos recurrentes, mantengo tu lista por consistencia
      'Personal y Nóminas',
      'Suministros Públicos',
      'Vehículos y Movilidad',
      'Alquileres e Inmuebles',
      'Herramientas de Empresa',
      'Gastos de Oficina y Administración'
    ),
    allowNull: false,
    defaultValue: 'Gastos de Oficina y Administración'
  },

  entityCode: {
    field: 'entity_code',
    type: DataTypes.STRING,
    allowNull: false,
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

  taxAmount: {
    field: 'tax_amount',
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  totalAmount: {
    field: 'total_amount',
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
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
