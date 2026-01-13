const { Model, DataTypes, Sequelize } = require('sequelize');

const SALESPOSTINVOICELINE_TABLE = 'sales_post_invoice_lines';

const salesPostInvoicetLineSchema = {
   codeInvoice: {
    field: 'code_invoice',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING,

    references: {
      model: 'sales_post_invoices',
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

class salesPostInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.salesPostInvoice, {
      as: 'invoice',
      foreignKey: 'code_invoice'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESPOSTINVOICELINE_TABLE,
      modelName: 'salesPostInvoiceLine',
      timestamps: true,
      underscored: true,
      id: false,
      primaryKey: ['code_invoice', 'line_no']
    };
  }
}

module.exports = { salesPostInvoiceLine, salesPostInvoicetLineSchema, SALESPOSTINVOICELINE_TABLE };
