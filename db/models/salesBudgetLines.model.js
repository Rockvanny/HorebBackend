const { Model, DataTypes, Sequelize } = require('sequelize');

const SALESBUDGETLINE_TABLE = 'sales_budget_lines';

const salesBudgetLineSchema = {
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
    primaryKey: true, // Parte de la clave primaria compuesta
    type: DataTypes.INTEGER,
  },

  codeItem: {
    field: 'item_code',
    allowNull: false,
    type: DataTypes.STRING,
  },

  description: {
    field: 'description',
    allowNull: true, // Asumo que la descripción puede ser opcional
    type: DataTypes.STRING
  },

  quantity: {
    field: 'quantity',
    allowNull: false,
    type: DataTypes.INTEGER,
  },

  unitMeasure: {
    field: 'unit_measure',
    allowNull: false,
    type: DataTypes.STRING,
  },

  quantityUnitMeasure: {
    field:'quantity_unit_measure',
    allowNull: false,
    type: DataTypes.INTEGER,
  },

  unitPrice: {
    field: 'unit_price',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  vat: {
    field: 'vat',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  amountLine: {
    field: 'amount_line',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

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

  static config(sequelize) {
    return {
      sequelize,
      tableName: SALESBUDGETLINE_TABLE,
      modelName: 'salesBudgetLine',
      timestamps: true,
      underscored: true,
      id: false,
      primaryKey: ['code_budget', 'line_no']
    };
  }
}

module.exports = { salesBudgetLine, salesBudgetLineSchema, SALESBUDGETLINE_TABLE };
