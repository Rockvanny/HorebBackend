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
  // CAMPOS GENÉRICOS
  codeItem: { field: 'item_code', type: DataTypes.STRING, allowNull: true },
  description: { field: 'description', type: DataTypes.TEXT },
  quantity: { field: 'quantity', type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
  unitMeasure: { field: 'unit_measure', type: DataTypes.STRING, defaultValue: 'UNIDAD' },
  quantityUnitMeasure: { field: 'quantity_unit_measure', type: DataTypes.DECIMAL(12, 4), defaultValue: 1 },
  unitPrice: { field: 'unit_price', type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },

  taxType: {
    field: 'tax_type',
    allowNull: false,
    type: DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
    defaultValue: 'IVA'
  },

  vat: { field: 'vat', type: DataTypes.DECIMAL(12, 4), defaultValue: 21 },
  amountLine: { field: 'amount_line', type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
  username: { field: 'user_name', type: DataTypes.STRING },
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
    }, { where: { code: codeDocument }, transaction });
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
