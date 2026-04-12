const { Model, DataTypes, Sequelize } = require('sequelize');

const SALESBUDGETLINE_TABLE = 'sales_budget_lines';

const salesBudgetLineSchema = {
  // CLAVE COMPUESTA
  codeBudget: {
    field: 'code_budget',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING,
    references: {
      model: 'sales_budgets',
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
    allowNull: false,
    type: DataTypes.STRING,
  },
  description: {
    field: 'description',
    type: DataTypes.STRING
  },

  // CANTIDADES (Cambiado a DECIMAL para mayor flexibilidad)
  quantity: {
    field: 'quantity',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  unitMeasure: {
    field: 'unit_measure',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'UNIDAD'
  },
  quantityUnitMeasure: {
    field: 'quantity_unit_measure',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  // PRECIOS E IMPUESTOS
  unitPrice: {
    field: 'unit_price',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  vat: { // Porcentaje de IVA
    field: 'vat',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  amountLine: { // Base imponible de la línea
    field: 'amount_line',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  // AUDITORÍA
  username: {
    field: 'user_name',
    type: DataTypes.STRING,
  },
  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
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
      as: 'budget',
      foreignKey: 'codeBudget' // Usamos el nombre de JS definido arriba
    });
  }

  // MÉTODO DE RECÁLCULO PARA PRESUPUESTOS
  static async updateBudgetTotals(codeBudget, transaction) {
    const { salesBudget } = this.sequelize.models;

    const lines = await this.findAll({
      where: { codeBudget },
      transaction
    });

    const totals = lines.reduce((acc, line) => {
      const base = parseFloat(line.amountLine) || 0;
      const vatPercent = parseFloat(line.vat) || 0;
      const vatAmount = base * (vatPercent / 100);

      acc.baseTotal += base;
      acc.vatTotal += vatAmount;
      return acc;
    }, { baseTotal: 0, vatTotal: 0 });

    // Actualizamos los campos estandarizados de la cabecera
    await salesBudget.update({
      amountWithoutVAT: totals.baseTotal,
      amountVAT: totals.vatTotal,
      amountWithVAT: totals.baseTotal + totals.vatTotal
    }, {
      where: { code: codeBudget },
      transaction
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
        afterSave: async (line, options) => {
          await this.updateBudgetTotals(line.codeBudget, options.transaction);
        },
        afterDestroy: async (line, options) => {
          await this.updateBudgetTotals(line.codeBudget, options.transaction);
        }
      }
    };
  }
}

module.exports = { salesBudgetLine, salesBudgetLineSchema, SALESBUDGETLINE_TABLE };
