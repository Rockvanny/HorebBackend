"use strict";
const { UNITMEASURE_TABLE } = require('./../models/unitMeasure.model');

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable(UNITMEASURE_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      description: {
        field: 'description',
        type: Sequelize.DataTypes.STRING
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
      },
      deleteAt: {
        field: 'delete_at',
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
        defaultValue: null
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable(UNITMEASURE_TABLE);
  }
};
