'use strict';
const { DataTypes, Sequelize, literal } = require('sequelize');
const { CUSTOMER_BUILDING_TABLE } = require('../models/customerBuilding.model');
const { BUILDING_TABLE } = require('../models/building.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(CUSTOMER_BUILDING_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      customerCode: {
        field: 'customer_code',
        allowNull: false,
        type: DataTypes.STRING,
        references: {
          model: 'customers',
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      buildingId: {
        field: 'building_id',
        allowNull: false,
        type: DataTypes.UUID,
        references: {
          model: BUILDING_TABLE,
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      unitNumber: {
        field: 'unit_number',
        allowNull: true,
        type: DataTypes.STRING,
      },
      relationshipType: {
        field: 'relationship_type',
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'PROPIETARIO'
      },
      isActive: {
        field: 'is_active',
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: true
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

    // "Mis edificios" (móvil) siempre filtra por cliente; el admin filtra a
    // menudo por edificio para ver todos sus residentes.
    await queryInterface.addIndex(CUSTOMER_BUILDING_TABLE, ['customer_code']);
    await queryInterface.addIndex(CUSTOMER_BUILDING_TABLE, ['building_id']);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(CUSTOMER_BUILDING_TABLE);
  }
};
