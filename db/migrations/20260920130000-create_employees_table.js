'use strict';
const { DataTypes, literal } = require('sequelize');
const { EMPLOYEE_TABLE } = require('../models/employee.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(EMPLOYEE_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.STRING,
      },
      full_name: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      email: {
        allowNull: false,
        unique: true,
        type: DataTypes.STRING,
      },
      password: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      must_change_password: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      role: {
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'operario',
      },
      created_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
      },
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(EMPLOYEE_TABLE);
  }
};
