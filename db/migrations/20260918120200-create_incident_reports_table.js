'use strict';
const { DataTypes, Sequelize, literal } = require('sequelize');
const { INCIDENT_REPORT_TABLE } = require('../models/incidentReport.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(INCIDENT_REPORT_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      entityCode: {
        field: 'entity_code',
        allowNull: false,
        type: DataTypes.STRING,
        references: {
          model: 'customers',
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        field: 'title',
        allowNull: false,
        type: DataTypes.STRING,
      },
      description: {
        field: 'description',
        allowNull: false,
        type: DataTypes.TEXT,
      },
      status: {
        field: 'status',
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'ABIERTO'
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

    // Listado "mis incidencias" siempre filtra por cliente.
    await queryInterface.addIndex(INCIDENT_REPORT_TABLE, ['entity_code']);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(INCIDENT_REPORT_TABLE);
  }
};
