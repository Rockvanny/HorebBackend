const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../libs/sequence.handler');

const SALESBUDGET_TABLE = 'sales_budgets';

const salesBudgetSchema = {
  // IDENTIFICADOR ÚNICO (Estandarizado)
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  // FECHAS (Igualado a purchInvoice)
  postingDate: {
    field: 'posting_date',
    type: DataTypes.DATE,
  },
  dueDate: {
    field: 'due_date',
    type: DataTypes.DATE,
  },
  // DATOS DEL CONTACTO (Estandarizado)
  customerCode: {
    field: 'customer_code',
    type: DataTypes.STRING,
  },
  name: { // Nombre del cliente (para la tabla genérica)
    field: 'name',
    type: DataTypes.STRING,
  },
  nif: { // Campo específico de venta
    field: 'nif',
    type: DataTypes.STRING,
  },
  email: { field: 'email', type: DataTypes.STRING },
  phone: { field: 'phone', type: DataTypes.STRING },
  address: { field: 'address', type: DataTypes.STRING },
  postCode: { field: 'post_code', type: DataTypes.STRING },
  city: { field: 'city', type: DataTypes.STRING },

  // ESTADO (Consistente con Compras)
  status: {
    field: 'status',
    type: DataTypes.STRING,
    defaultValue: 'Borrador'
  },

  // TOTALES (Copiado exacto de purchInvoice para que el Front no sufra)
  amountWithoutVAT: {
    field: 'amount_without_vat', // Corregido: todo minúsculas
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  amountVAT: {
    field: 'amount_vat',
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  amountWithVAT: {
    field: 'amount_with_vat',
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  // AUDITORÍA
  username: {
    field: 'user_name',
    type: DataTypes.STRING,
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

class salesBudget extends Model {
  static associate(models) {
    this.belongsTo(models.Customer, {
      as: 'customer',
      foreignKey: 'customer_code'
    });

    this.hasMany(models.salesBudgetLine, {
      as: 'lines',
      foreignKey: 'codeBudget'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESBUDGET_TABLE,
      modelName: 'salesBudget',
      timestamps: true,
      underscored: true,
      hooks: { // CORRECCIÓN: Encapsulado en el objeto hooks
        beforeValidate: async (instance, options) => {
          if (instance.isNewRecord) {
            await generateNextCode(instance, options);
          }
        }
      }
    }
  }
}

module.exports = { salesBudget, salesBudgetSchema, SALESBUDGET_TABLE };
