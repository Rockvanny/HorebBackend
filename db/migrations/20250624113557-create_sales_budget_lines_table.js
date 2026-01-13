'use strict';
const { DataTypes } = require("sequelize");

const { SALESBUDGETLINE_TABLE } = require('../models/salesBudgetLines.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESBUDGETLINE_TABLE, {
      codeBudget: {
        field: 'code_budget',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING,

        references: {
          model: 'sales_budgets',
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      lineNo: {
        field: 'line_no',
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },

      codeItem: {
        field: 'item_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },

      description: {
        field: 'description',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },

      quantity: {
        field: 'quantity',
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },

      unitMeasure: {
        field: 'unit_measure',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },

      quantityUnitMeasure: {
        field: 'quantity_unit_measure',
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },

      unitPrice: {
        field: 'unit_price',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      vat: {
        field: 'vat',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      amountLine: {
        field: 'amount_line',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      username: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },

      createdAt: {
        field: 'created_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },

      updatedAt: {
        field: 'updated_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(SALESBUDGETLINE_TABLE);
  }
};
