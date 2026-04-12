'use strict';
const { USER_TABLE } = require('./../models/user.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(USER_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      // --- NUEVO CAMPO: NOMBRE Y APELLIDOS ---
      fullName: {
        field: 'full_name',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'Usuario Nuevo'
      },
      email: {
        field: 'email',
        allowNull: false,
        unique: true,
        type: Sequelize.DataTypes.STRING,
      },
      password: {
        field: 'password',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      mustChangePassword: {
        field: 'must_change_password',
        allowNull: false,
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: true,
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
