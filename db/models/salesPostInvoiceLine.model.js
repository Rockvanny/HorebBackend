const { Model, DataTypes, Sequelize } = require('sequelize');

const SALESPOSTINVOICELINE_TABLE = 'sales_post_invoice_lines';

const salesPostInvoiceLineSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  codeDocument: {
    field: 'code_document',
    allowNull: false,
    type: DataTypes.STRING,
    references: { model: 'sales_post_invoices', key: 'code' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  lineNo: {
    field: 'line_no',
    allowNull: false,
    type: DataTypes.INTEGER,
  },
  codeItem: { field: 'item_code', type: DataTypes.STRING, allowNull: true },
  description: { field: 'description', type: DataTypes.TEXT },
  quantity: { field: 'quantity', type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
  unitMeasure: {
    field: 'unit_measure',
    type: DataTypes.ENUM('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK'),
    defaultValue: 'UNIDAD'
  },
  quantityUnitMeasure: { field: 'quantity_unit_measure', type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 1 },
  unitPrice: { field: 'unit_price', type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },

  // --- NUEVA COLUMNA: Tipo de Impuesto (Inmutable para el histórico) ---
  taxType: {
    field: 'tax_type',
    type: DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
    allowNull: false,
    defaultValue: 'IVA'
  },
  // ---------------------------------------------------------------------

  vat: { field: 'vat', type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 21 },
  amountLine: { field: 'amount_line', type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 0 },
  username: { field: 'user_name', type: DataTypes.STRING },
};

class salesPostInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.salesPostInvoice, {
      as: 'parentDocument',
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
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['code_document', 'line_no']
        }
      ]
    };
  }
}

module.exports = { salesPostInvoiceLine, salesPostInvoiceLineSchema, SALESPOSTINVOICELINE_TABLE };
