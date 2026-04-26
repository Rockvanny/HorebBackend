const { Model, DataTypes } = require('sequelize');

const SALESPOSTINVOICE_TAX_TABLE = 'sales_post_invoice_taxes';

const salesPostInvoiceTaxSchema = {
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
      model: 'sales_post_invoices', // Referencia a la tabla legal/definitiva
      key: 'code'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT' // Por seguridad legal, no permite borrar si existen impuestos asociados
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

class salesPostInvoiceTax extends Model {
  static associate(models) {
    this.belongsTo(models.salesPostInvoice, {
      as: 'postInvoice',
      foreignKey: 'invoiceCode',
      targetKey: 'code'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESPOSTINVOICE_TAX_TABLE,
      modelName: 'salesPostInvoiceTax',
      timestamps: true,
      underscored: true
    };
  }
}

module.exports = { salesPostInvoiceTax, salesPostInvoiceTaxSchema, SALESPOSTINVOICE_TAX_TABLE };
