'use strict';
const { DataTypes, literal } = require('sequelize');
const { OPERATING_EXPENSES_TABLE } = require('../models/operatingExpenses.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(OPERATING_EXPENSES_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      date: {
        field: 'date',
        allowNull: false,
        type: DataTypes.DATEONLY
      },
      category: {
        field: 'category',
        type: DataTypes.ENUM(
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
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: { field: 'name', type: DataTypes.STRING, allowNull: false },
      nif: { field: 'nif', type: DataTypes.STRING, allowNull: false },
      concept: {
        field: 'concept',
        type: DataTypes.STRING,
        allowNull: false,
      },
      baseAmount: {
        field: 'base_amount',
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      tax: {
        field: 'tax_%',
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      taxAmount: {
        field: 'tax_amount',
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      irpf: {
        field: 'irpf_%',
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      amountIrpf: {
        field: 'amount_irpf',
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      totalAmount: {
        field: 'total_amount',
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
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
      isValidated: {
        field: 'is_validated',
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      userName: {
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
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(OPERATING_EXPENSES_TABLE);
    // Limpieza de ENUMs en Postgres al revertir
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_operating_expenses_category";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_operating_expenses_payment_method";');
  }
};
