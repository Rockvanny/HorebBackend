const { Model, DataTypes, Sequelize } = require('sequelize');

const SALESPOSTINVOICELINE_TABLE = 'sales_post_invoice_lines';

const salesPostInvoiceLineSchema = {
  // CLAVE COMPUESTA NORMALIZADA
  codeDocument: {
    field: 'code_document', // Igualamos el nombre al del borrador
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
    primaryKey: true,
    type: DataTypes.INTEGER,
  },
  // CAMPOS NORMALIZADOS (Precisión 12, 4)
  codeItem: {
    field: 'item_code',
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    field: 'description',
    type: DataTypes.TEXT // Cambiado a TEXT como el borrador para descripciones largas
  },
  quantity: {
    field: 'quantity',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0
  },
  unitMeasure: {
    field: 'unit_measure',
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'UNIDAD'
  },
  quantityUnitMeasure: {
    field: 'quantity_unit_measure',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 1
  },
  unitPrice: {
    field: 'unit_price',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0
  },
  vat: {
    field: 'vat',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 21
  },
  amountLine: {
    field: 'amount_line',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0
  },
  username: {
    field: 'user_name',
    type: DataTypes.STRING
  },
  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  },
  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  }
};

class salesPostInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.salesPostInvoice, {
      as: 'parentDocument', // Alias igualado al borrador para consistencia
      foreignKey: 'codeDocument',
      targetKey: 'code'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESPOSTINVOICELINE_TABLE,
      modelName: 'salesPostInvoiceLine',
      timestamps: true,
      underscored: true
    };
  }
}

module.exports = { salesPostInvoiceLine, salesPostInvoiceLineSchema, SALESPOSTINVOICELINE_TABLE };
