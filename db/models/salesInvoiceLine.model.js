// models/salesInvoiceLines.model.js
const { Model, DataTypes, Sequelize } = require('sequelize');

const SALESINVOICELINE_TABLE = 'sales_invoice_lines';

const salesInvoiceLineSchema = {
  // CLAVE COMPUESTA NORMALIZADA
  codeDocument: {
    field: 'code_invoice', // Mantenemos el nombre de la columna física para no romper la DB
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING,
    references: {
      model: 'sales_invoices',
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

  // PRODUCTO Y DESCRIPCIÓN
  codeItem: {
    field: 'item_code',
    allowNull: true, // Igual que en ofertas, puede ser una línea de texto puro
    type: DataTypes.STRING,
  },
  description: {
    field: 'description',
    type: DataTypes.TEXT // Cambiado a TEXT para permitir descripciones largas como en ofertas
  },

  // CANTIDADES (Estandarizado a 12, 4)
  quantity: {
    field: 'quantity',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  unitMeasure: {
    field: 'unit_measure',
    type: DataTypes.STRING,
    defaultValue: 'UNIDAD'
  },
  quantityUnitMeasure: {
    field: 'quantity_unit_measure',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 1.0000 // Valor base 1
  },

  // PRECIOS E IMPUESTOS (Estandarizado a 12, 4)
  unitPrice: {
    field: 'unit_price',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  vat: {
    field: 'vat',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 21.0000 // Por defecto 21%
  },
  amountLine: {
    field: 'amount_line',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },

  // AUDITORÍA
  username: {
    field: 'user_name',
    type: DataTypes.STRING,
  }
};

class salesInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.salesInvoice, {
      as: 'parentDocument',
      foreignKey: 'codeDocument',
      targetKey: 'code'
    });
  }

  // MÉTODO DE RECÁLCULO ESTANDARIZADO
  static async updateInvoiceTotals(codeDocument, transaction) {
    const { salesInvoice } = this.sequelize.models;

    const lines = await this.findAll({
      where: { codeDocument },
      transaction
    });

    const totals = lines.reduce((acc, line) => {
      const base = Number(line.amountLine) || 0;
      const vatPercent = Number(line.vat) || 0;
      const vatAmount = base * (vatPercent / 100);

      acc.baseTotal += base;
      acc.vatTotal += vatAmount;
      return acc;
    }, { baseTotal: 0, vatTotal: 0 });

    await salesInvoice.update({
      amountWithoutVAT: totals.baseTotal.toFixed(4),
      amountVAT: totals.vatTotal.toFixed(4),
      amountWithVAT: (totals.baseTotal + totals.vatTotal).toFixed(4)
    }, {
      where: { code: codeDocument },
      transaction
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESINVOICELINE_TABLE,
      modelName: 'salesInvoiceLine',
      timestamps: true,
      underscored: true,
      hooks: {
        afterSave: async (line, opts) => {
          if (opts.transaction) await this.updateInvoiceTotals(line.codeDocument, opts.transaction);
        },
        afterDestroy: async (line, opts) => {
          if (opts.transaction) await this.updateInvoiceTotals(line.codeDocument, opts.transaction);
        },
        afterBulkCreate: async (lines, opts) => {
          if (lines.length > 0 && opts.transaction) await this.updateInvoiceTotals(lines[0].codeDocument, opts.transaction);
        }
      }
    };
  }
}

module.exports = { salesInvoiceLine, salesInvoiceLineSchema, SALESINVOICELINE_TABLE };
