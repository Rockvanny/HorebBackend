'use strict';
const { DataTypes, literal } = require('sequelize');
const { VENDOR_TABLE } = require('./../models/vendor.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(VENDOR_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.STRING
      },
      name: {
        field: 'name',
        allowNull: false,
        type: DataTypes.STRING,
      },
      nif: {
        field: 'nif',
        allowNull: false,
        type: DataTypes.STRING,
      },
      email: {
        field: 'email',
        allowNull: false,
        type: DataTypes.STRING,
      },
      phone: {
        field: 'phone',
        allowNull: false,
        type: DataTypes.STRING,
      },
      address: {
        field: 'address',
        allowNull: false,
        type: DataTypes.STRING,
      },
      postCode: {
        field: 'post_code',
        allowNull: false,
        type: DataTypes.STRING,
      },
      city: {
        field: 'city',
        allowNull: false,
        type: DataTypes.STRING,
      },
      category: {
        field: 'category',
        type: DataTypes.ENUM(
          'Suministros de Obra',
          'Logística de Materiales',
          'Material de Construcción',
          'Equipamiento / Maquinaria',
          'Servicios Externos de Obra'
        ),
        allowNull: false,
        defaultValue: 'Suministros de Obra'
      },
      paymentMethod: {
        field: 'payment_method',
        type: DataTypes.ENUM(
          'Transferencia',
          'Efectivo',
          'Tarjeta',
          'Bizum',
        ),
        allowNull: false,
        defaultValue: 'Transferencia'
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
    await queryInterface.dropTable(VENDOR_TABLE);

    // Limpieza de los ENUMs creados en PostgreSQL al revertir
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vendors_category";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vendors_payment_method";');
  }
};
