'use strict';
const { DataTypes, literal } = require('sequelize'); 
const { PRODUCT_TABLE } = require('../models/products.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(PRODUCT_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.STRING
      },
      name: {
        field: 'name',
        type: DataTypes.STRING,
        allowNull: false,
      },
      unitMeasure: {
        field: 'unit_measure',
        type: DataTypes.ENUM('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK'),
        defaultValue: 'UNIDAD'
      },
      qtyByUnitMeasure: {
        field: 'qty_by_unit_measure',
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      price: {
        field: 'price',
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      taxType: {
        field: 'tax_type',
        allowNull: false,
        type: DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
        defaultValue: 'IVA'
      },
      vat: {
        field: 'vat',
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userName: {
        field: 'user_name',
        type: DataTypes.STRING,
      },
      createdAt: {
        field: 'created_at',
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP') // <--- Usamos literal directamente
      },
      updatedAt: {
        field: 'updated_at',
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP') // <--- Usamos literal directamente
      },
      deleteAt: {
        field: 'delete_at',
        allowNull: true,
        type: DataTypes.DATE,
        defaultValue: null
      }
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(PRODUCT_TABLE);
  }
};
