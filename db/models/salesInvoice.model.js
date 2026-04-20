const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const SALESINVOICE_TABLE = 'sales_invoices';

const salesInvoiceSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  codePosting: {
    field: 'code_posting',
    type: DataTypes.STRING,
    allowNull: true
  },
  typeInvoice: {
    field: 'type_invoice',
    type: DataTypes.ENUM('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'),
    allowNull: false,
    defaultValue: 'F1'
  },
  parentCode: {
    field: 'parent_code',
    type: DataTypes.STRING,
    allowNull: true
  },
  rectificationType: {
    field: 'rectification_type',
    type: DataTypes.ENUM('S', 'I'),
    allowNull: true
  },
  budgetCode: {
    field: 'budget_code',
    type: DataTypes.STRING,
    allowNull: true
  },
  postingDate: {
    field: 'posting_date',
    type: DataTypes.DATE,
    allowNull: false // Requisito legal
  },
  dueDate: {
    field: 'due_date',
    type: DataTypes.DATE,
    allowNull: true
  },
  entityCode: {
    field: 'entity_code',
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    field: 'name',
    type: DataTypes.STRING,
    allowNull: false // Requisito legal (Razón Social)
  },
  nif: {
    field: 'nif',
    type: DataTypes.STRING,
    allowNull: false // Requisito legal
  },
  email: {
    field: 'email',
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    field: 'phone',
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    field: 'address',
    type: DataTypes.STRING,
    allowNull: false // Requisito legal (Domicilio Fiscal)
  },
  postCode: {
    field: 'post_code',
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    field: 'city',
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    field: 'status',
    type: DataTypes.ENUM('Abierto', 'Pagado'),
    allowNull: false,
    defaultValue: 'Abierto'
  },
  paymentMethod: {
    field: 'payment_method',
    type: DataTypes.ENUM('Tarjeta', 'Efectivo', 'Transferencia'),
    allowNull: false,
    defaultValue: 'Tarjeta'
  },
  amountWithoutVAT: {
    field: 'amount_without_vat',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  amountVAT: {
    field: 'amount_vat',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  amountWithVAT: {
    field: 'amount_with_vat',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  comments: {
    field: 'comments',
    type: DataTypes.TEXT,
    allowNull: true
  },
  username: {
    field: 'user_name', // Mapeo correcto a la columna de DB
    type: DataTypes.STRING,
    allowNull: true
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

class salesInvoice extends Model {
  static associate(models) {
    this.belongsTo(models.Customer, {
      as: 'customer',
      foreignKey: 'entity_code'
    });

    this.hasMany(models.salesInvoiceLine, {
      as: 'lines',
      foreignKey: 'codeDocument',
      sourceKey: 'code',
      onDelete: 'CASCADE',
      hooks: true
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESINVOICE_TABLE,
      modelName: 'salesInvoice',
      timestamps: false,
      underscored: true,
      hooks: {
        beforeValidate: async (instance, options) => {
          if (instance.isNewRecord && !instance.code) {
            await generateNextCode(instance, options);
          }
        }
      }
    };
  }
}

module.exports = { salesInvoice, salesInvoiceSchema, SALESINVOICE_TABLE };
