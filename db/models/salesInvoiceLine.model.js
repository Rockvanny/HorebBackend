const { Model, DataTypes, Sequelize } = require('sequelize');

const SALESINVOICELINE_TABLE = 'sales_invoice_lines';

const salesInvoiceLineSchema = {
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
    references: { model: 'sales_invoices', key: 'code' },
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
  quantity: { field: 'quantity', type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
  unitMeasure: { field: 'unit_measure', type: DataTypes.STRING, defaultValue: 'UNIDAD' },
  quantityUnitMeasure: { field: 'quantity_unit_measure', type: DataTypes.DECIMAL(12, 4), defaultValue: 1 },
  unitPrice: { field: 'unit_price', type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },

  // --- NUEVA COLUMNA: Tipo de Impuesto ---
  taxType: {
    field: 'tax_type',
    type: DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
    allowNull: false,
    defaultValue: 'IVA'
  },
  // ---------------------------------------

  vat: { field: 'vat', type: DataTypes.DECIMAL(12, 4), defaultValue: 21 },
  amountLine: { field: 'amount_line', type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
  username: { field: 'user_name', type: DataTypes.STRING },
};

class salesInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.salesInvoice, {
      as: 'parentDocument',
      foreignKey: 'codeDocument',
      targetKey: 'code'
    });
  }

  /**
   * Red de seguridad: Recalcula la cabecera si se toca una línea individualmente
   * Nota: El servicio suele sobreescribir esto con la librería de cálculos.
   */
  static async updateDocumentTotals(codeDocument, transaction) {
    const { salesInvoice, DocumentTax } = this.sequelize.models;
    const lines = await this.findAll({ where: { codeDocument }, transaction });

    const totals = lines.reduce((acc, line) => {
      const base = Number(line.amountLine) || 0;
      const vatPercent = Number(line.vat) || 0;

      // Lógica simple: Si es IRPF, resta; si no, suma.
      const isNegative = line.taxType === 'IRPF';
      const taxAmount = base * (vatPercent / 100);

      acc.baseTotal += base;
      acc.taxTotal += isNegative ? -taxAmount : taxAmount;

      return acc;
    }, { baseTotal: 0, taxTotal: 0 });

    await salesInvoice.update({
      amountWithoutVAT: totals.baseTotal.toFixed(4),
      amountVAT: totals.taxTotal.toFixed(4),
      amountWithVAT: (totals.baseTotal + totals.taxTotal).toFixed(4)
    }, { where: { code: codeDocument }, transaction });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESINVOICELINE_TABLE,
      modelName: 'salesInvoiceLine',
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

module.exports = { salesInvoiceLine, salesInvoiceLineSchema, SALESINVOICELINE_TABLE };
