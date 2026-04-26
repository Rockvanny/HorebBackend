'use strict';
const { PRODUCT_TABLE } = require('../models/products.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(PRODUCT_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      name: {
        field: 'name',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      unitMeasure: {
        field: 'unit_measure',
        type: Sequelize.DataTypes.ENUM('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK'),
        defaultValue: 'UNIDAD'
      },
      qtyByUnitMeasure: {
        field: 'qty_by_unit_measure',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      price: {
        field: 'price',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      taxType: {
        field: 'tax_type',
        allowNull: false,
        type: Sequelize.DataTypes.ENUM('IVA', 'IRPF', 'RE', 'EXENTO'),
        defaultValue: 'IVA'
      },
      vat: {
        field: 'vat',
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      userName: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
      },
      createdAt: {
        field: 'created_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        field: 'updated_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      // Sincronizado con el modelo: paranoid utiliza delete_at
      deleteAt: {
        field: 'delete_at',
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
        defaultValue: null
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(PRODUCT_TABLE);
  }
};
