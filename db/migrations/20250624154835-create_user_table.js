'use strict';
const { DataTypes } = require("sequelize");
const { USER_TABLE } = require('./../models/user.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(USER_TABLE, {
      Userid: {
        field: 'user_id',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      email: {
        field: 'email',
        type: Sequelize.DataTypes.STRING,
      },
      password: {
        field: 'password',
        type: Sequelize.DataTypes.STRING,
      },
      role: {
        field: 'role',
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
    await queryInterface.dropTable(USER_TABLE);
  }
};
