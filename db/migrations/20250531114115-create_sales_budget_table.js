'use strict';

// Mantenemos tu sintaxis de importación original
const { SALESBUDGET_TABLE } = require('../models/salesBudget.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESBUDGET_TABLE, {
      code: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      posting_date: {
        field: 'posting_date',
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      due_date: {
        field: 'due_date',
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      customer_code: {
        field: 'customer_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.DataTypes.STRING,
      },
      nif: {
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
      status: {
        type: Sequelize.DataTypes.ENUM('Borrador', 'Aprobada', 'Rechazada'),
        allowNull: false,
        defaultValue: 'Borrador'
      },
      comments: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true
      },
      // Importante: Usamos DECIMAL(12, 4) para coincidir con la lógica de precisión
      amount_without_vat: {
        field: 'amount_without_vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amount_vat: {
        field: 'amount_vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amount_with_vat: {
        field: 'amount_with_vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
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
    await queryInterface.dropTable(SALESBUDGET_TABLE);
    // Nota: Si la migración falla y usas Postgres, puede que debas borrar el ENUM manualmente
    // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_budgets_status";');
  }
};
