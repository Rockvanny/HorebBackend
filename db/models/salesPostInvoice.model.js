const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const SALESPOSTINVOICE_TABLE = 'sales_post_invoices';

const salesPostInvoiceSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  preInvoice: {
    field: 'pre_Invoice',
    allowNull: false,
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

  budgetCode: {
    field: 'budget_code',
    type: DataTypes.STRING
  },

  customerCode: {
    field: 'customer_code',
    type: DataTypes.STRING,
  },

  name: {
    field: 'name',
    type: DataTypes.STRING,
  },

  email: {
    field: 'email',
    type: DataTypes.STRING,
  },

  phone: {
    field: 'phone',
    type: DataTypes.STRING,
  },

  address: {
    field: 'address',
    type: DataTypes.STRING,
  },

  postCode: {
    field: 'post_code',
    type: DataTypes.STRING,
  },

  city: {
    field: 'city',
    type: DataTypes.STRING,
  },

  paymentMethod: {
    field: 'payment_method',
    type: DataTypes.STRING,
  },

  status: {
    field: 'status',
    type: DataTypes.STRING,
  },

  amountWithoutVAT: {
    field: 'amount_Without_vat',
    type: DataTypes.DECIMAL(10, 2),
  },

  amountVAT: {
    field: 'amount_vat',
    type: DataTypes.DECIMAL(10, 2),
  },

  amountWithVAT: {
    field: 'amount_with_vat',
    type: DataTypes.DECIMAL(10, 2),
  },

  username: {
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
}

class salesPostInvoice extends Model {

  static associate(models) {
    // Una factura compra pertenece a un cliente
    this.belongsTo(models.Customer, {
      as: 'customer',
      foreignKey: 'customer_code'
    });

    this.hasMany(models.salesPostInvoiceLine, {
      as: 'lines',
      foreignKey: 'codeInvoice'
    })
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESPOSTINVOICE_TABLE,
      modelName: 'salesPostInvoice',
      timestamps: true,
      underscored: true,
      beforeValidate: async (instance, options) => {
        // Solo actuamos si es un registro nuevo (Creación)
        if (instance.isNewRecord) {
          // Pasamos la instancia y las opciones (que traen la transacción)
          await generateNextCode(instance, options);
        }

      }
    }
  }
}

module.exports = { salesPostInvoice, salesPostInvoiceSchema, SALESPOSTINVOICE_TABLE };
