const { Model, DataTypes, Sequelize } = require('sequelize');

const PURCHPOSTINVOICELINE_TABLE = 'purch_post_invoice_lines';

const purchPostInvoiceLineSchema = {
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
    references: {
      model: 'purch_post_invoices', // Nombre de la tabla de cabecera
      key: 'code'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },

  lineNo: {
    field: 'line_no',
    allowNull: false,
    type: DataTypes.INTEGER,
  },

  codeItem: {
    field: 'item_code',
    type: DataTypes.STRING,
    allowNull: true // Puede ser un gasto directo sin código de artículo
  },

  description: {
    field: 'description',
    type: DataTypes.TEXT,
    allowNull: false
  },

  quantity: {
    field: 'quantity',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0
  },

  unitMeasure: {
    field: 'unit_measure',
    type: DataTypes.ENUM('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK'),
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

  taxType: {
    field: 'tax_type',
    type: DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
    allowNull: false,
    defaultValue: 'IVA'
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

  userName: {
    field: 'user_name',
    type: DataTypes.STRING
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

class purchPostInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.purchPostInvoice, {
      as: 'parentInvoice',
      foreignKey: 'codeInvoice',
      targetKey: 'code'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHPOSTINVOICELINE_TABLE,
      modelName: 'purchPostInvoiceLine',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['code_invoice', 'line_no']
        }
      ]
    };
  }
}

module.exports = { purchPostInvoiceLine, purchPostInvoiceLineSchema, PURCHPOSTINVOICELINE_TABLE };
