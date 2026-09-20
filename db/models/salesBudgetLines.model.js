// models/salesBudgetLines.model.js
const { Model, DataTypes, Sequelize } = require('sequelize');

const SALESBUDGETLINE_TABLE = 'sales_budget_lines';

const salesBudgetLineSchema = {
  // CLAVE COMPUESTA NORMALIZADA
  codeDocument: {
    field: 'code_document',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING,
    references: { model: 'sales_budgets', key: 'code' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },

  lineNo: {
    field: 'line_no',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.INTEGER,
  },

  // PRODUCTO: línea normal con cantidad/precio (validaciones de siempre).
  // COMENTARIO: solo texto libre en 'description' — el resto de campos se
  // deshabilita en el frontend y no suma a los totales (ver
  // libs/taxCalculation.js).
  type: {
    field: 'type',
    type: DataTypes.ENUM('PRODUCTO', 'COMENTARIO'),
    allowNull: false,
    defaultValue: 'PRODUCTO'
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
    type: DataTypes.ENUM('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK', 'ML'),
    defaultValue: 'UNIDAD'
  },
  width: {
    field: 'width',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0
  },

  height: {
    field: 'height',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0
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
    allowNull: false,
    type: DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
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

class salesBudgetLine extends Model {
  static associate(models) {
    this.belongsTo(models.salesBudget, {
      as: 'parentDocument',
      foreignKey: 'codeDocument',
      targetKey: 'code'
    });
  }

  static async updateDocumentTotals(codeDocument, transaction) {
    const { salesBudget } = this.sequelize.models;
    const lines = await this.findAll({ where: { codeDocument }, transaction });

    const totals = lines.reduce((acc, line) => {
      const base = Number(line.amountLine) || 0;
      const vatAmount = base * (Number(line.vat) / 100);
      acc.baseTotal += base;
      acc.vatTotal += vatAmount;
      return acc;
    }, { baseTotal: 0, vatTotal: 0 });

    await salesBudget.update({
      amountWithoutVAT: totals.baseTotal.toFixed(4),
      amountVAT: totals.vatTotal.toFixed(4),
      amountWithVAT: (totals.baseTotal + totals.vatTotal).toFixed(4)
    }, {
      where: { code: codeDocument },
      transaction,
      // Ver mismo comentario en salesInvoiceLine.model.js#updateDocumentTotals:
      // Model.update() valida por defecto construyendo un build() solo con
      // estos 3 campos (sin code/seriesCode) y reactivaba generateNextCode,
      // quemando un número de serie de presupuesto por cada línea creada/
      // borrada. Este recálculo no necesita validar nada.
      validate: false
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESBUDGETLINE_TABLE,
      modelName: 'salesBudgetLine',
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

module.exports = { salesBudgetLine, salesBudgetLineSchema, SALESBUDGETLINE_TABLE };
