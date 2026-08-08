'use strict';
const { DataTypes, literal } = require('sequelize');
const { CUSTOMER_TABLE } = require('./../models/customer.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(CUSTOMER_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: DataTypes.STRING
      },
      name: {
        field: 'name',
        type: DataTypes.STRING,
      },
      nif: {
        field: 'nif',
        type: DataTypes.STRING,
      },
      email: {
        field: 'email',
        type: DataTypes.STRING,
      },
      phone: {
        field: 'phone',
        type: DataTypes.STRING,
      },
      address: {
        field: 'address',
        type: DataTypes.STRING,
      },
      postCode: {
        field: 'post_code',
        type: DataTypes.STRING,
      },
      city: {
        field: 'city',
        type: DataTypes.STRING,
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
    await queryInterface.dropTable(CUSTOMER_TABLE);

    // Limpieza del ENUM generado en Postgres al revertir
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_customers_payment_method";');
  }
};
