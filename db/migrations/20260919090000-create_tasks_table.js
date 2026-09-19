'use strict';
const { DataTypes, Sequelize, literal } = require('sequelize');
const { TASK_TABLE } = require('../models/task.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(TASK_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4
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
      type: {
        field: 'type',
        allowNull: false,
        type: DataTypes.STRING,
      },
      status: {
        field: 'status',
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'PENDIENTE'
      },
      priority: {
        field: 'priority',
        allowNull: false,
        type: DataTypes.STRING,
        defaultValue: 'MEDIA'
      },
      dueDate: {
        field: 'due_date',
        allowNull: true,
        type: DataTypes.DATE,
      },
      assignedTo: {
        field: 'assigned_to',
        allowNull: false,
        type: DataTypes.STRING,
        references: {
          model: 'users',
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      createdBy: {
        field: 'created_by',
        allowNull: false,
        type: DataTypes.STRING,
      },
      address: {
        field: 'address',
        allowNull: true,
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

    // Listado "mis tareas" (pestaña Tareas del móvil) siempre filtra por
    // asignatario; listado admin filtra a menudo por estado.
    await queryInterface.addIndex(TASK_TABLE, ['assigned_to']);
    await queryInterface.addIndex(TASK_TABLE, ['status']);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(TASK_TABLE);
  }
};
