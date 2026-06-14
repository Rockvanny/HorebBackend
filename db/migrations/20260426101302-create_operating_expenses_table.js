'use strict';
const { OPERATING_EXPENSES_TABLE } = require('./../models/operatingExpenses.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(OPERATING_EXPENSES_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER
      },
      date: {
        field: 'date',
        allowNull: false,
        type: Sequelize.DataTypes.DATEONLY
      },
      category: {
        field: 'category',
        type: Sequelize.DataTypes.ENUM(
          'Personal y Nóminas',
          'Suministros Públicos',
          'Vehículos y Movilidad',
          'Alquileres e Inmuebles',
          'Herramientas de Empresa',
          'Gastos de Oficina y Administración'
        ),
        allowNull: false,
        defaultValue: 'Personal y Nóminas'
      },
      entityCode: {
        field: 'entity_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      name: { field: 'name', type: Sequelize.DataTypes.STRING, allowNull: false },
      nif: { field: 'nif', type: Sequelize.DataTypes.STRING, allowNull: false },
      concept: {
        field: 'concept',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      baseAmount: {
        field: 'base_amount',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      taxAmount: {
        field: 'tax_amount',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      totalAmount: {
        field: 'total_amount',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
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
      isValidated: {
        field: 'is_validated',
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
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
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(OPERATING_EXPENSES_TABLE);
  }
};
