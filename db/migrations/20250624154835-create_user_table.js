'use strict';
const { SYSTEM_ENUM_TABLE } = require('./../models/systemEnum.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SYSTEM_ENUM_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER
      },
      model: {
        field: 'model',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      field: {
        field: 'field',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      code: {
        field: 'code',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      description: {
        field: 'description',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      sortOrder: {
        field: 'sort_order',
        type: Sequelize.DataTypes.INTEGER,
        defaultValue: 0
      },
      isActive: {
        field: 'is_active',
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: true
      },
      // --- TIMESTAMPS ---
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
        type: Sequelize.DataTypes.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(SYSTEM_ENUM_TABLE);
  }
};
