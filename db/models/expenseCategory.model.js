const { Model, DataTypes } = require('sequelize');

const EXPENSE_CATEGORY_TABLE = 'expense_categories';

/**
 * Categorías de gasto editables (Configuración › Categorías de gasto, ver
 * migración 20261114180000-create_expense_categories.js). Las usan
 * proveedores, gastos operativos y facturas de compra (borrador y
 * registradas), que guardan el NOMBRE con clave foránea a `name`:
 * renombrar se propaga solo (ON UPDATE CASCADE) y una categoría en uso no se
 * borra, se desactiva (ver expenseCategories.service.js#delete).
 */
const ExpenseCategorySchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  name: {
    allowNull: false,
    unique: true,
    type: DataTypes.STRING(80)
  },
  // Gasto general de la empresa (luz, alquiler, nóminas...): en una factura
  // de compra sin obra se avisa de que quizá sea un gasto operativo (ver
  // Frontend fields-purchinvoice-handler.js#confirmSave).
  isGeneralExpense: {
    field: 'is_general_expense',
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Inactiva: ya no se ofrece en los desplegables; los registros que la
  // tienen la conservan.
  active: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sortOrder: {
    field: 'sort_order',
    allowNull: false,
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE
  },
  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE
  }
};

/**
 * Columna `category` de las tablas que usan el catálogo (antes, el mismo
 * ENUM de 11 valores copiado en cada modelo). Guarda el nombre; la clave
 * foránea de la base de datos garantiza que exista.
 */
const categoryAttribute = ({ allowNull = false } = {}) => ({
  field: 'category',
  type: DataTypes.STRING(80),
  allowNull
});

class ExpenseCategory extends Model {
  static associate() { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: EXPENSE_CATEGORY_TABLE,
      modelName: 'ExpenseCategory',
      timestamps: true,
      underscored: true
    };
  }
}

module.exports = { ExpenseCategory, ExpenseCategorySchema, EXPENSE_CATEGORY_TABLE, categoryAttribute };
