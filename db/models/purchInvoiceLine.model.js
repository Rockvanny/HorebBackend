// models/purchInvoiceLines.model.js
const { Model, DataTypes, Sequelize } = require('sequelize');

const PURCHINVOICELINE_TABLE = 'purch_invoice_lines';

const purchInvoiceLineSchema = {
  // CLAVE COMPUESTA NORMALIZADA
  codeDocument: {
    field: 'code_invoice', // Mantenemos el nombre físico de la columna en la DB
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

  // DATOS DEL PRODUCTO/SERVICIO
  codeItem: {
    field: 'item_code',
    allowNull: true, // Permitimos null para gastos generales sin artículo codificado
    type: DataTypes.STRING,
  },
  description: {
    field: 'description',
    type: DataTypes.TEXT // TEXT para descripciones largas de proveedores
  },

  // CANTIDADES Y MEDIDAS (Estandarizado a 12, 4)
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
    defaultValue: 1.0000 // Valor base 1 para evitar multiplicaciones por cero
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
    defaultValue: 21.0000
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

class purchInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.purchInvoice, {
      as: 'parentDocument',
      foreignKey: 'codeDocument',
      targetKey: 'code'
    });
  }

  // MÉTODO ESTÁTICO DE RECÁLCULO (Sincronizado con Ventas)
  static async updateInvoiceTotals(codeDocument, transaction) {
    const { purchInvoice } = this.sequelize.models;

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

    await purchInvoice.update({
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
      tableName: PURCHINVOICELINE_TABLE,
      modelName: 'purchInvoiceLine',
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

module.exports = { purchInvoiceLine, purchInvoiceLineSchema, PURCHINVOICELINE_TABLE };
