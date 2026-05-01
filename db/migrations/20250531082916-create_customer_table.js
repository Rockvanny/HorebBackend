'use strict';
const { CUSTOMER_TABLE } = require('./../models/customer.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(CUSTOMER_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      name: {
        field: 'name',
        type: Sequelize.DataTypes.STRING,
      },
      nif: {
        field: 'nif',
        type: Sequelize.DataTypes.STRING,
      },
      email: {
        field: 'email',
        type: Sequelize.DataTypes.STRING,
      },
      phone: {
        field: 'phone',
        type: Sequelize.DataTypes.STRING,
      },
      address: {
        field: 'address',
        type: Sequelize.DataTypes.STRING,
      },
      postCode: {
        field: 'post_code',
        type: Sequelize.DataTypes.STRING,
      },
      city: {
        field: 'city',
        type: Sequelize.DataTypes.STRING,
      },

      paymentMethod: {
        field: 'payment_method',
        type: Sequelize.DataTypes.ENUM(
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
      deleteAt: {
        field: 'delete_at',
        allowNull: true,
        type: Sequelize.DataTypes.DATE,
        defaultValue: null
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(CUSTOMER_TABLE);
  }
};
