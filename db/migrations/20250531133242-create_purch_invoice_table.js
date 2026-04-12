'use strict';

const { PURCHINVOICE_TABLE } = require('../models/purchInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(PURCHINVOICE_TABLE, {
      code: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      code_posting: {
        field: 'code_posting',
        type: Sequelize.DataTypes.STRING
      },
      posting_date: {
        field: 'posting_date',
        type: Sequelize.DataTypes.DATEONLY,
      },
      due_date: {
        field: 'due_date',
        type: Sequelize.DataTypes.DATEONLY,
      },
      budget_code: {
        field: 'budget_code',
        type: Sequelize.DataTypes.STRING
      },
      vendor_code: {
        field: 'vendor_code',
        type: Sequelize.DataTypes.STRING,
      },
      name: {
        type: Sequelize.DataTypes.STRING,
      },
      email: {
        type: Sequelize.DataTypes.STRING,
      },
      phone: {
        type: Sequelize.DataTypes.STRING,
      },
      address: {
        type: Sequelize.DataTypes.STRING,
      },
      post_code: {
        field: 'post_code',
        type: Sequelize.DataTypes.STRING,
      },
      city: {
        type: Sequelize.DataTypes.STRING,
      },
      payment_method: {
        field: 'payment_method',
        type: Sequelize.DataTypes.STRING,
      },
      status: {
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'Borrador'
      },
      category: {
        type: Sequelize.DataTypes.ENUM(
          'Materiales',
          'Subcontratas',
          'Personal y Nóminas',
          'Herramientas y Alquileres',
          'Vehículos y Movilidad',
          'Gastos de Oficina y Varios'
        ),
        allowNull: true,
        defaultValue: 'Gastos de Oficina y Varios'
      },
      // TOTALES NORMALIZADOS (Importante: minúsculas)
      amount_without_vat: {
        field: 'amount_without_vat', // Corregido: sin la W mayúscula
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      amount_vat: {
        field: 'amount_vat',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      amount_with_vat: {
        field: 'amount_with_vat',
        type: Sequelize.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      user_name: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
      },
      created_at: {
        field: 'created_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        field: 'updated_at',
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(PURCHINVOICE_TABLE);
  }
};
