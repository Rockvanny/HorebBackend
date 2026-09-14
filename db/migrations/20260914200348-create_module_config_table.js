'use strict';
const { DataTypes, literal } = require('sequelize');
const { MODULE_CONFIG_TABLE } = require('../models/moduleConfig.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(MODULE_CONFIG_TABLE, {
      key: {
        field: 'key',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.STRING
      },
      name: {
        field: 'name',
        allowNull: false,
        type: DataTypes.STRING,
      },
      description: {
        field: 'description',
        allowNull: true,
        type: DataTypes.STRING,
      },
      enabled: {
        field: 'enabled',
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      username: {
        field: 'user_name',
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

    // Semilla: Veri*factu ya funciona hoy de forma obligatoria (ver
    // services/salesPostInvoice.service.js), así que nace activado para no
    // cambiar el comportamiento actual con esta migración. Desactivarlo pasa
    // a ser una decisión explícita del admin desde el front.
    await queryInterface.bulkInsert(MODULE_CONFIG_TABLE, [{
      key: 'VERIFACTU',
      name: 'Veri*factu (Facturación electrónica AEAT)',
      description: 'Genera el hash encadenado, el XML y el registro de trazabilidad AEAT al registrar cada factura de venta.',
      enabled: true,
      user_name: 'system',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(MODULE_CONFIG_TABLE);
  }
};
