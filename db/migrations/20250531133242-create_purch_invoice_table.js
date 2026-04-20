'use strict';
const { PURCHINVOICE_TABLE } = require('../models/purchInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(PURCHINVOICE_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      codePosting: {
        field: 'code_posting',
        type: Sequelize.DataTypes.STRING
      },
      budgetCode: {
        field: 'budget_code',
        type: Sequelize.DataTypes.STRING
      },
      postingDate: {
        field: 'posting_date',
        type: Sequelize.DataTypes.DATE,
      },
      dueDate: {
        field: 'due_date',
        type: Sequelize.DataTypes.DATE,
      },
      entityCode: {
        field: 'entity_code',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      name: { field: 'name', type: Sequelize.DataTypes.STRING },
      nif: { field: 'nif', type: Sequelize.DataTypes.STRING },
      email: { field: 'email', type: Sequelize.DataTypes.STRING },
      phone: { field: 'phone', type: Sequelize.DataTypes.STRING },
      address: { field: 'address', type: Sequelize.DataTypes.STRING },
      postCode: { field: 'post_code', type: Sequelize.DataTypes.STRING },
      city: { field: 'city', type: Sequelize.DataTypes.STRING },
      paymentMethod: {
        field: 'payment_method',
        type: Sequelize.DataTypes.ENUM('Tarjeta', 'Efectivo', 'Transferencia'),
        allowNull: false,
        defaultValue: 'Tarjeta'
      },
      status: {
        field: 'status',
        type: Sequelize.DataTypes.ENUM('Abierto', 'Pagado'),
        allowNull: false,
        defaultValue: 'Abierto'
      },
      category: {
        field: 'category',
        type: Sequelize.DataTypes.ENUM(
          'Materiales', 'Subcontratas', 'Personal y Nóminas',
          'Herramientas y Alquileres', 'Vehículos y Movilidad', 'Gastos de Oficina y Varios'
        ),
        allowNull: false,
        defaultValue: 'Gastos de Oficina y Varios'
      },
      amountWithoutVAT: {
        field: 'amount_without_vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amountVAT: {
        field: 'amount_vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amountWithVAT: {
        field: 'amount_with_vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      comments: { field: 'comments', type: Sequelize.DataTypes.TEXT },
      username: { field: 'user_name', type: Sequelize.DataTypes.STRING },
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

  down: async (queryInterface) => {
    await queryInterface.dropTable(PURCHINVOICE_TABLE);
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_category";');
  }
};
