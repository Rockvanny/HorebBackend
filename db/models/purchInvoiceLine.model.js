const id = require('faker/lib/locales/id_ID');
const { Model, DataTypes, Sequelize } = require('sequelize');

const PURCHINVOICELINE_TABLE = 'purch_invoice_lines';

const purchInvoiceLineSchema = {
   codeInvoice: {
    field: 'code_invoice',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING,

    references: {
      model: 'purch_invoices',
      key: 'code'
    },

    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },

  lineNo: {
    field: 'line_no',
    allowNull: false,
    primaryKey: true, // Parte de la clave primaria compuesta
    type: DataTypes.INTEGER,
  },

  codeItem: {
    field: 'item_code',
    allowNull: false,
    type: DataTypes.STRING,
  },

  description: {
    field: 'description',
    allowNull: true, // Asumo que la descripción puede ser opcional
    type: DataTypes.STRING
  },

  quantity: {
    field: 'quantity',
    allowNull: false,
    type: DataTypes.INTEGER,
  },

  unitMeasure: {
    field: 'unit_measure',
    allowNull: false,
    type: DataTypes.STRING,
  },

  quantityUnitMeasure: {
    field:'quantity_unit_measure',
    allowNull: false,
    type: DataTypes.INTEGER,
  },

  unitPrice: {
    field: 'unit_price',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  vat: {
    field: 'vat',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  amountLine: {
    field: 'amount_line',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  username: {
    field: 'user_name',
    type: DataTypes.STRING,
  },

  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },

  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
};

class purchInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.purchInvoice, {
      as: 'invoice',
      foreignKey: 'code_invoice'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHINVOICELINE_TABLE,
      modelName: 'purchInvoiceLine',
      timestamps: true,
      underscored: true,
      id: false,
      primaryKey: ['code_invoice', 'line_no']
    };
  }
}

module.exports = { purchInvoiceLine, purchInvoiceLineSchema, PURCHINVOICELINE_TABLE };
