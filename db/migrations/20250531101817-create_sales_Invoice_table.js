'use strict';
const { SALESINVOICE_TABLE } = require('../models/salesInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESINVOICE_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      code_posting: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      type_invoice: {
        type: Sequelize.DataTypes.ENUM('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'),
        allowNull: false,
        defaultValue: 'F1'
      },
      parent_code: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      rectification_type: {
        type: Sequelize.DataTypes.ENUM('S', 'I'),
        allowNull: true
      },
      budget_code: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      posting_date: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false
      },
      due_date: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      entity_code: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      name: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false
      },
      nif: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false
      },
      email: { type: Sequelize.DataTypes.STRING },
      phone: { type: Sequelize.DataTypes.STRING },
      address: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false
      },
      post_code: { type: Sequelize.DataTypes.STRING },
      city: { type: Sequelize.DataTypes.STRING },
      status: {
        type: Sequelize.DataTypes.ENUM('Abierto', 'Pagado'),
        allowNull: false,
        defaultValue: 'Abierto'
      },
      payment_method: {
        type: Sequelize.DataTypes.ENUM('Tarjeta', 'Efectivo', 'Transferencia'),
        allowNull: false,
        defaultValue: 'Tarjeta'
      },
      amount_without_vat: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amount_vat: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amount_with_vat: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      comments: { type: Sequelize.DataTypes.TEXT },
      user_name: { type: Sequelize.DataTypes.STRING },
      created_at: {
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(SALESINVOICE_TABLE);
    // Eliminar los tipos ENUM creados por la migración en Postgres
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoices_type_invoice";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoices_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoices_rectification_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoices_payment_method";');
  }
};
