const { Model, DataTypes } = require('sequelize');

const SALESINVOICE_TAX_TABLE = 'sales_invoice_taxes';

const salesInvoiceTaxSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  invoiceCode: {
    field: 'invoice_code',
    allowNull: false,
    type: DataTypes.STRING,
    references: {
      model: 'sales_invoices', // Debe coincidir con el nombre de tabla de cabeceras
      key: 'code'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  taxType: {
    field: 'tax_type',
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'IVA'
  },
  taxPercentage: {
    field: 'tax_percentage',
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  taxableAmount: {
    field: 'taxable_amount',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  taxAmount: {
    field: 'tax_amount',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  }
};

class salesInvoiceTax extends Model {
  static associate(models) {
    this.belongsTo(models.salesInvoice, {
      as: 'invoice',
      foreignKey: 'invoiceCode',
      targetKey: 'code'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESINVOICE_TAX_TABLE,
      modelName: 'salesInvoiceTax',
      timestamps: true,
      underscored: true
    };
  }
}

module.exports = { salesInvoiceTax, salesInvoiceTaxSchema, SALESINVOICE_TAX_TABLE };
