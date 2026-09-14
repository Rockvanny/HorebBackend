'use strict';
const { DataTypes, literal } = require('sequelize');
const { VERIFACTU_CONFIG_TABLE } = require('../models/verifactuConfig.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(VERIFACTU_CONFIG_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
      },
      use_provider: {
        field: 'use_provider',
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      provider_name: {
        field: 'provider_name',
        allowNull: true,
        type: DataTypes.STRING,
      },
      api_base_url: {
        field: 'api_base_url',
        allowNull: true,
        type: DataTypes.STRING,
      },
      api_key: {
        field: 'api_key',
        allowNull: true,
        type: DataTypes.STRING,
      },
      api_secret: {
        field: 'api_secret',
        allowNull: true,
        type: DataTypes.TEXT,
      },
      user_name: {
        field: 'user_name',
        type: DataTypes.STRING,
      },
      created_at: {
        field: 'created_at',
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        field: 'updated_at',
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
      }
    });

    // Fila inicial con el comportamiento actual por defecto: modo local (XML
    // exportable, sin proveedor externo configurado).
    await queryInterface.bulkInsert(VERIFACTU_CONFIG_TABLE, [{
      use_provider: false,
      user_name: 'system',
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(VERIFACTU_CONFIG_TABLE);
  }
};
