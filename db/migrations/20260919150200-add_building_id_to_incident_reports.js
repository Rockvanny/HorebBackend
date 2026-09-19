'use strict';
const { DataTypes } = require('sequelize');
const { INCIDENT_REPORT_TABLE } = require('../models/incidentReport.model');
const { BUILDING_TABLE } = require('../models/building.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn(INCIDENT_REPORT_TABLE, 'building_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: BUILDING_TABLE,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      // Si se borra un edificio, la incidencia no desaparece, solo pierde la
      // referencia -el historial del cliente sigue intacto-.
      onDelete: 'SET NULL'
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn(INCIDENT_REPORT_TABLE, 'building_id');
  }
};
