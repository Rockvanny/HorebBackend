'use strict';
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
        allowNull: false,
        unique: true,
        type: Sequelize.DataTypes.STRING,
      },
      password: {
        field: 'password', // Asegúrate de que coincida con el modelo
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      role: {
        field: 'role',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'viewer'
      },
      // --- PERMISOS DE MÓDULOS ---
      allowGestion: {
        field: 'allow_gestion',
        allowNull: false,
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: true,
      },
      allowSales: {
        field: 'allow_sales',
        allowNull: false,
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: true,
      },
      allowPurchases: {
        field: 'allow_purchases',
        allowNull: false,
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
      },
      allowReports: {
        field: 'allow_reports',
        allowNull: false,
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
      },
      allowSettings: {
        field: 'allow_settings',
        allowNull: false,
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
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
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(USER_TABLE);
  }
};
