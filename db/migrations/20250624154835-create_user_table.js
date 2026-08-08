'use strict';
const { DataTypes, literal } = require('sequelize');
const { USER_TABLE } = require('../models/user.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(USER_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.STRING,
      },
      fullName: {
        field: 'full_name',
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'Usuario Nuevo',
      },
      email: {
        field: 'email',
        allowNull: false,
        type: DataTypes.STRING,
        unique: true,
      },
      password: {
        field: 'password',
        allowNull: false,
        type: DataTypes.STRING,
      },
      mustChangePassword: {
        field: 'must_change_password',
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      role: {
        field: 'role',
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'viewer',
      },
      allowGestion: {
        field: 'allow_gestion',
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      allowSales: {
        field: 'allow_sales',
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      allowPurchases: {
        field: 'allow_purchases',
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      allowReports: {
        field: 'allow_reports',
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      allowSettings: {
        field: 'allow_settings',
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        field: 'created_at',
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        field: 'updated_at',
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(USER_TABLE);
  },
};
