'use strict';
const { DataTypes } = require("sequelize");

const { SALESBUDGET_TABLE } = require('../models/salesBudget.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESBUDGET_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      postingDate: {
        field: 'posting_date',
        type: Sequelize.DataTypes.DATEONLY,
      },
      dueDate: {
        field: 'due_date',
        type: Sequelize.DataTypes.DATEONLY,
      },
      customerCode: {
        field: 'customer_code',
        type: Sequelize.DataTypes.STRING,
      },
      name: {
        field: 'name',
        type: Sequelize.DataTypes.STRING,
      },
      nif: {
        field: 'nif',
        type: Sequelize.DataTypes.STRING,
      },
      email: {
        field: 'email',
        type: Sequelize.DataTypes.STRING,
      },
      phone: {
        field: 'phone',
        type: Sequelize.DataTypes.STRING,
      },
      address: {
        field: 'address',
        type: Sequelize.DataTypes.STRING,
      },
      postCode: {
        field: 'post_code',
        type: Sequelize.DataTypes.STRING,
      },
      city: {
        field: 'city',
        type: Sequelize.DataTypes.STRING,
      },
      status: {
        field: 'status',
        type: Sequelize.DataTypes.STRING,
      },
      amountWithoutVAT: {
        field: 'amount_Without_vat',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      amountVAT: {
        field: 'amount_vat',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      amountWithVAT: {
        field: 'amount_with_vat',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      username: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(SALESBUDGET_TABLE);
  }
};
