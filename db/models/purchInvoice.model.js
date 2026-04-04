const { Model, DataTypes, Sequelize } = require('sequelize');

const PURCHINVOICE_TABLE = 'purch_invoices';

const purchInvoiceSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },

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

class purchInvoice extends Model {

  static associate(models) {
    // Una factura de compra pertenece a un proveedor
    this.belongsTo(models.Vendor, {
      as: 'Vendor',
      foreignKey: 'vendor_code'
    });

    // Una factura puede tener varias líneas de detalle
    this.hasMany(models.purchInvoiceLine, {
      as: 'lines',
      foreignKey: 'codeInvoice'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHINVOICE_TABLE,
      modelName: 'purchInvoice',
      timestamps: true,
      underscored: true
    }
  }
}

module.exports = { purchInvoice, purchInvoiceSchema, PURCHINVOICE_TABLE };
