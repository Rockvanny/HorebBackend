'use strict';
const { DataTypes } = require('sequelize');
const { VERIFACTU_CONFIG_TABLE } = require('../models/verifactuConfig.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn(VERIFACTU_CONFIG_TABLE, 'is_test', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      // true por defecto para no cambiar de golpe el comportamiento actual
      // (todos los registros creados hasta ahora ya se generaban con
      // isTest=true fijo, ver services/salesPostInvoice.service.js): hay que
      // desactivarlo a propósito desde Configuración Veri*factu para pasar
      // a producción.
      defaultValue: true,
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeColumn(VERIFACTU_CONFIG_TABLE, 'is_test');
  }
};
