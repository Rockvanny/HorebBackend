const { Model, DataTypes, Sequelize } = require('sequelize');

const PURCHINVOICELINE_TABLE = 'purch_invoice_lines';

const purchInvoiceLineSchema = {
  // CLAVE COMPUESTA NORMALIZADA (Espejo de salesBudgetLine)
  codeDocument: {
    field: 'code_document', // Cambiado de code_invoice a code_document para consistencia total
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
    primaryKey: true,
    type: DataTypes.INTEGER,
  },
  // CAMPOS GENÉRICOS (Mismos nombres que en ofertas)
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
    defaultValue: 0.0000
  },
  unitMeasure: {
    field: 'unit_measure',
    type: DataTypes.ENUM('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK'),
    defaultValue: 'UNIDAD'
  },
  quantityUnitMeasure: {
    field: 'quantity_unit_measure',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 1.0000
  },
  unitPrice: {
    field: 'unit_price',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  vat: {
    field: 'vat',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 21.0000
  },
  amountLine: {
    field: 'amount_line',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  username: {
    field: 'user_name',
    type: DataTypes.STRING
  },
};

class purchInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.purchInvoice, {
      as: 'parentDocument',
      foreignKey: 'codeDocument',
      targetKey: 'code'
    });
  }

  // MÉTODO ESTÁTICO NORMALIZADO (Mismo nombre que en ofertas: updateDocumentTotals)
  static async updateDocumentTotals(codeDocument, transaction) {
    const { purchInvoice } = this.sequelize.models;
    const lines = await this.findAll({ where: { codeDocument }, transaction });

    const totals = lines.reduce((acc, line) => {
      const base = Number(line.amountLine) || 0;
      const vatAmount = base * (Number(line.vat) / 100);
      acc.baseTotal += base;
      acc.vatTotal += vatAmount;
      return acc;
    }, { baseTotal: 0, vatTotal: 0 });

    await purchInvoice.update({
      amountWithoutVAT: totals.baseTotal.toFixed(4),
      amountVAT: totals.vatTotal.toFixed(4),
      amountWithVAT: (totals.baseTotal + totals.vatTotal).toFixed(4)
    }, { where: { code: codeDocument }, transaction });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHINVOICELINE_TABLE,
      modelName: 'purchInvoiceLine',
      timestamps: true,
      underscored: true,
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
