'use strict';

const { SALESBUDGET_TABLE } = require('../models/salesBudget.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESBUDGET_TABLE, {
      code: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      posting_date: { // Cambiado a snake_case para la DB
        field: 'posting_date',
        type: Sequelize.DataTypes.DATEONLY,
      },
      due_date: {
        field: 'due_date',
        type: Sequelize.DataTypes.DATEONLY,
      },
      customer_code: {
        field: 'customer_code',
        type: Sequelize.DataTypes.STRING,
      },
      name: {
        type: Sequelize.DataTypes.STRING,
      },
      nif: {
        type: Sequelize.DataTypes.STRING,
      },
      email: {
        type: Sequelize.DataTypes.STRING,
      },
      phone: {
        type: Sequelize.DataTypes.STRING,
      },
      address: {
        type: Sequelize.DataTypes.STRING,
      },
      post_code: {
        field: 'post_code',
        type: Sequelize.DataTypes.STRING,
      },
      city: {
        type: Sequelize.DataTypes.STRING,
      },
      status: {
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'Borrador'
      },
      // TOTALES ESTANDARIZADOS (Igual que en facturas)
      amount_without_vat: {
        field: 'amount_without_vat', // Corregido: minúsculas
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      amount_vat: {
        field: 'amount_vat',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      amount_with_vat: {
        field: 'amount_with_vat',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      user_name: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(SALESBUDGET_TABLE);
  }
};
