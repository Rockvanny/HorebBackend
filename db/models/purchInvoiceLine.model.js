const { Model, DataTypes, Sequelize } = require('sequelize');

const PURCHINVOICELINE_TABLE = 'purch_invoice_lines';

const purchInvoiceLineSchema = {
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
      model: 'purch_invoices',
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
    allowNull: true
  },

  description: {
    field: 'description',
    type: DataTypes.TEXT
  },

  quantity: {
    field: 'quantity',
    type: DataTypes.DECIMAL(12, 4),
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
    defaultValue: 1
  },

  unitPrice: {
    field: 'unit_price',
    type: DataTypes.DECIMAL(12, 4),
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
    defaultValue: 21
  },

  amountLine: {
    field: 'amount_line',
    type: DataTypes.DECIMAL(12, 4),
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

class purchInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.purchInvoice, {
      as: 'parentDocument',
      foreignKey: 'codeDocument',
      targetKey: 'code'
    });
  }

  /**
   * Recalcula la cabecera de la factura de compra basándose en sus líneas.
   * Maneja correctamente impuestos positivos (IVA) y negativos (IRPF).
   */
  static async updateDocumentTotals(codeDocument, transaction) {
    const { purchInvoice } = this.sequelize.models;
    const lines = await this.findAll({ where: { codeDocument }, transaction });

    const totals = lines.reduce((acc, line) => {
      const base = Number(line.amountLine) || 0;
      const taxPercent = Number(line.vat) || 0;

      // El IRPF resta del total en la factura, el IVA suma.
      const isNegative = line.taxType === 'IRPF';
      const taxAmount = base * (taxPercent / 100);

      acc.baseTotal += base;
      acc.taxTotal += isNegative ? -taxAmount : taxAmount;

      return acc;
    }, { baseTotal: 0, taxTotal: 0 });

    await purchInvoice.update({
      amountWithoutVAT: totals.baseTotal.toFixed(4),
      amountVAT: totals.taxTotal.toFixed(4),
      amountWithVAT: (totals.baseTotal + totals.taxTotal).toFixed(4)
    }, {
      where: { code: codeDocument },
      transaction
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHINVOICELINE_TABLE,
      modelName: 'purchInvoiceLine',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['code_document', 'line_no']
        }
      ],
      hooks: {
        afterSave: async (line, opts) => {
          await this.updateDocumentTotals(line.codeDocument, opts.transaction);
        },
        afterDestroy: async (line, opts) => {
          await this.updateDocumentTotals(line.codeDocument, opts.transaction);
        },
        afterBulkCreate: async (lines, opts) => {
          if (lines.length > 0) {
            await this.updateDocumentTotals(lines[0].codeDocument, opts.transaction);
          }
        }
      }
    };
  }
}

module.exports = { purchInvoiceLine, purchInvoiceLineSchema, PURCHINVOICELINE_TABLE };
