'use strict';
const { DataTypes } = require('sequelize');
const { TASK_TABLE } = require('../models/task.model');
const { BUILDING_TABLE } = require('../models/building.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn(TASK_TABLE, 'building_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: BUILDING_TABLE,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      // Si se borra un edificio, la tarea no desaparece, solo pierde la
      // referencia -igual criterio que incident_reports.building_id-.
      onDelete: 'SET NULL'
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn(TASK_TABLE, 'building_id');
  }
};
