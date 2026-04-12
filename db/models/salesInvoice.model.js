const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../libs/sequence.handler');

const SALESINVOICE_TABLE = 'sales_invoices';

const salesInvoiceSchema = {
  // IDENTIFICADOR (Estandarizado)
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  // REGISTRO Y FECHAS
  codePosting: {
    field: 'code_posting',
    type: DataTypes.STRING
  },
  postingDate: {
    field: 'posting_date',
    type: DataTypes.DATE,
  },
  dueDate: {
    field: 'due_date',
    type: DataTypes.DATE,
  },
  // VÍNCULO CON PRESUPUESTO
  budgetCode: {
    field: 'budget_code',
    type: DataTypes.STRING
  },
  // DATOS DEL CLIENTE
  customerCode: {
    field: 'customer_code',
    type: DataTypes.STRING,
  },
  name: { // Nombre genérico para la tabla del Front
    field: 'name',
    type: DataTypes.STRING,
  },
  email: { field: 'email', type: DataTypes.STRING },
  phone: { field: 'phone', type: DataTypes.STRING },
  address: { field: 'address', type: DataTypes.STRING },
  postCode: { field: 'post_code', type: DataTypes.STRING },
  city: { field: 'city', type: DataTypes.STRING },

  // CONFIGURACIÓN Y ESTADO
  paymentMethod: {
    field: 'payment_method',
    type: DataTypes.STRING,
  },
  status: {
    field: 'status',
    type: DataTypes.STRING,
    defaultValue: 'Borrador'
  },

  // TOTALES (Consistencia absoluta)
  amountWithoutVAT: {
    field: 'amount_without_vat', // Normalizado a minúsculas
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

class salesInvoice extends Model {
  static associate(models) {
    this.belongsTo(models.Customer, {
      as: 'customer',
      foreignKey: 'customer_code'
    });

    this.hasMany(models.salesInvoiceLine, {
      as: 'lines',
      foreignKey: 'codeInvoice'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESINVOICE_TABLE,
      modelName: 'salesInvoice',
      timestamps: true,
      underscored: true,
      hooks: { // CORRECCIÓN: Encapsulado en objeto hooks
        beforeValidate: async (instance, options) => {
          if (instance.isNewRecord) {
            await generateNextCode(instance, options);
          }
        }
      }
    }
  }
}

module.exports = { salesInvoice, salesInvoiceSchema, SALESINVOICE_TABLE };
