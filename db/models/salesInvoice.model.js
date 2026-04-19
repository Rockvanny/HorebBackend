const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const SALESINVOICE_TABLE = 'sales_invoices';

const salesInvoiceSchema = {
  code: {
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  codePosting: {
    field: 'code_posting',
    type: DataTypes.STRING
  },
  // Clasificación para cumplimiento AEAT/Verifactu
  typeInvoice: {
    field: 'type_invoice',
    type: DataTypes.ENUM('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'),
    allowNull: false,
    defaultValue: 'F1',
    comment: 'F1: Factura, F2: Simplificada, R: Rectificativas'
  },
  // Referencia a factura origen (obligatorio para rectificativas)
  parentCode: {
    field: 'parent_code',
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Referencia al código de factura que se rectifica'
  },
  // NUEVO: Método de rectificación (S: Sustitución, I: Diferencias)
  rectificationType: {
    field: 'rectification_type',
    type: DataTypes.ENUM('S', 'I'),
    allowNull: true,
    comment: 'S: Sustitución, I: Diferencias. Obligatorio para tipos R'
  },
  budgetCode: {
    field: 'budget_code',
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
  customerCode: {
    field: 'customer_code',
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: DataTypes.STRING,
  nif: DataTypes.STRING,
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  address: DataTypes.STRING,
  postCode: {
    field: 'post_code',
    type: DataTypes.STRING
  },
  city: DataTypes.STRING,

  status: {
    type: DataTypes.ENUM('Abierto', 'Pagado'),
    allowNull: false,
    defaultValue: 'Abierto'
  },
  paymentMethod: {
    type: DataTypes.ENUM('Tarjeta', 'Efectivo', 'Transferencia'),
    allowNull: false,
    defaultValue: 'Tarjeta'
  },
  amountWithoutVAT: {
    field: 'amount_without_vat',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  amountVAT: {
    field: 'amount_vat',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  amountWithVAT: {
    field: 'amount_with_vat',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  comments: DataTypes.TEXT,
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
