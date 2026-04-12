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
    allowNull: true, // Permitir líneas de texto libre sin código de artículo
    type: DataTypes.STRING,
  },
  description: {
    field: 'description',
    type: DataTypes.TEXT // Cambiado a TEXT para descripciones largas
  },

  // CANTIDADES (Sincronizado a 4 decimales)
  quantity: {
    field: 'quantity',
    allowNull: false,
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  unitMeasure: {
    field: 'unit_measure',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'UNIDAD'
  },
  // Este campo suele ser para conversiones, lo mantenemos normalizado
  quantityUnitMeasure: {
    field: 'quantity_unit_measure',
    allowNull: false,
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },

  // PRECIOS E IMPUESTOS
  unitPrice: {
    field: 'unit_price',
    allowNull: false,
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  vat: {
    field: 'vat',
    allowNull: false,
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 21.0000 // Por defecto el IVA estándar
  },
  amountLine: {
    field: 'amount_line',
    allowNull: false,
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
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
      foreignKey: 'code_budget'
    });
  }

  // MÉTODO DE RECÁLCULO PARA CABECERA
  static async updateBudgetTotals(codeBudget, transaction) {
    const { salesBudget } = this.sequelize.models;

    const lines = await this.findAll({
      where: { codeBudget },
      transaction
    });

    const totals = lines.reduce((acc, line) => {
      // Usamos Number() para asegurar precisión en el cálculo intermedio
      const base = Number(line.amountLine) || 0;
      const vatPercent = Number(line.vat) || 0;
      const vatAmount = base * (vatPercent / 100);

      acc.baseTotal += base;
      acc.vatTotal += vatAmount;
      return acc;
    }, { baseTotal: 0, vatTotal: 0 });

    // Redondeo final a 4 decimales para la DB
    await salesBudget.update({
      amountWithoutVAT: totals.baseTotal.toFixed(4),
      amountVAT: totals.vatTotal.toFixed(4),
      amountWithVAT: (totals.baseTotal + totals.vatTotal).toFixed(4)
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
        // Importante: El recálculo ocurre tras cualquier cambio en las líneas
        afterSave: async (line, options) => {
          if (options.transaction) {
            await this.updateBudgetTotals(line.codeBudget, options.transaction);
          }
        },
        afterDestroy: async (line, options) => {
          if (options.transaction) {
            await this.updateBudgetTotals(line.codeBudget, options.transaction);
          }
        },
        // afterBulkCreate es vital para cuando insertamos muchas líneas de golpe
        afterBulkCreate: async (lines, options) => {
          if (lines.length > 0 && options.transaction) {
            await this.updateBudgetTotals(lines[0].codeBudget, options.transaction);
          }
        }
      }
    };
  }
}

module.exports = { salesBudgetLine, salesBudgetLineSchema, SALESBUDGETLINE_TABLE };
