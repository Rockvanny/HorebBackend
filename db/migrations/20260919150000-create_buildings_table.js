'use strict';
const { DataTypes, Sequelize, literal } = require('sequelize');
const { BUILDING_TABLE } = require('../models/building.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(BUILDING_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        field: 'name',
        allowNull: false,
        type: DataTypes.STRING,
      },
      address: {
        field: 'address',
        allowNull: false,
        type: DataTypes.STRING,
      },
      postCode: {
        field: 'post_code',
        allowNull: true,
        type: DataTypes.STRING,
      },
      city: {
        field: 'city',
        allowNull: true,
        type: DataTypes.STRING,
      },
      province: {
        field: 'province',
        allowNull: true,
        type: DataTypes.STRING,
      },
      contractCode: {
        field: 'contract_code',
        allowNull: true,
        type: DataTypes.STRING,
      },
      contractStartDate: {
        field: 'contract_start_date',
        allowNull: true,
        type: DataTypes.DATEONLY,
      },
      contractEndDate: {
        field: 'contract_end_date',
        allowNull: true,
        type: DataTypes.DATEONLY,
      },
      contractStatus: {
        field: 'contract_status',
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'ACTIVO'
      },
      maintenanceScope: {
        field: 'maintenance_scope',
        allowNull: true,
        type: DataTypes.TEXT,
      },
      administratorName: {
        field: 'administrator_name',
        allowNull: true,
        type: DataTypes.STRING,
      },
      administratorPhone: {
        field: 'administrator_phone',
        allowNull: true,
        type: DataTypes.STRING,
      },
      notes: {
        field: 'notes',
        allowNull: true,
        type: DataTypes.TEXT,
      },
      createdAt: {
        field: 'created_at',
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        field: 'updated_at',
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(BUILDING_TABLE);
  }
};
