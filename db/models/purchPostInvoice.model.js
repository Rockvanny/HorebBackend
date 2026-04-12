const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../libs/sequence.handler');

const PURCHPOSTINVOICE_TABLE = 'purch_post_invoices';

const purchPostInvoiceSchema = {
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
    field: 'post_date',
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

  vendorCode: {
    field: 'vendor_code',
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

  category: {
    field: 'category',
    type: DataTypes.ENUM(
      'Materiales',
      'Subcontratas',
      'Personal y Nóminas',
      'Herramientas y Alquileres',
      'Vehículos y Movilidad',
      'Gastos de Oficina y Varios'
    ),
    allowNull: true,
    defaultValue: 'Gastos de Oficina y Varios'
  },

  amountWithoutVAT: {
    field: 'amount_without_vat',
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

class purchpostInvoice extends Model {
  static associate(models) {
    // Una factura compra pertenece a un proveedor
    this.belongsTo(models.Vendor, {
      as: 'vendor',
      foreignKey: 'vendor_code'
    });

    this.hasMany(models.purchPostInvoiceLine, {
      as: 'lines',
      foreignKey: 'codeInvoice'
    })
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHPOSTINVOICE_TABLE,
      modelName: 'purchpostInvoice',
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

module.exports = { purchpostInvoice, purchPostInvoiceSchema, PURCHPOSTINVOICE_TABLE };
