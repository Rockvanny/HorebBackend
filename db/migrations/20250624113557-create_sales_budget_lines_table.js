'use strict';

const { SALESBUDGETLINE_TABLE } = require('../models/salesBudgetLines.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESBUDGETLINE_TABLE, {
      code_document: {
        field: 'code_document',
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
      line_no: {
        field: 'line_no',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER,
      },
      item_code: {
        field: 'item_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      description: {
        field: 'description',
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      quantity: {
        field: 'quantity',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      unit_measure: {
        field: 'unit_measure',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'UNIDAD'
      },
      quantity_unit_measure: {
        field: 'quantity_unit_measure',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 1.0000
      },
      unit_price: {
        field: 'unit_price',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      tax_type: {
        field: 'tax_type',
        allowNull: false,
        type: Sequelize.DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
        defaultValue: 'IVA'
      },
      vat: {
        field: 'var',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 21.0000
      },
      amount_line: {
        field: 'amount_line',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      user_name: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        field: 'created_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        field: 'updated_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex(SALESBUDGETLINE_TABLE, ['code_document']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable(SALESBUDGETLINE_TABLE);
  }
};
