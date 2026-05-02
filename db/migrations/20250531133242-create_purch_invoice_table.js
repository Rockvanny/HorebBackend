'use strict';
const { PURCHINVOICE_TABLE } = require('../models/purchInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(PURCHINVOICE_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER
      },
      movement_id: {
        field: 'movement_id',
        allowNull: false,
        unique: true,
        type: Sequelize.DataTypes.UUID,
        defaultValue: Sequelize.DataTypes.UUIDV4
      },
      code: {
        field: 'code',
        allowNull: false,
        unique: true,
        type: Sequelize.DataTypes.STRING
      },
      series_code: {
        field: 'series_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      code_posting: {
        field: 'code_posting',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      type_invoice: {
        field: 'type_invoice',
        type: Sequelize.DataTypes.ENUM('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'),
        allowNull: false,
        defaultValue: 'F1'
      },
      parent_code: {
        field: 'parent_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      rectification_type: {
        field: 'rectification_type',
        type: Sequelize.DataTypes.ENUM('S', 'I'),
        allowNull: true
      },
      budget_code: {
        field: 'budget_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      posting_date: {
        field: 'posting_date',
        type: Sequelize.DataTypes.DATE,
        allowNull: false
      },
      due_date: {
        field: 'due_date',
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      entity_code: {
        field: 'entity_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      name: { field: 'name', type: Sequelize.DataTypes.STRING, allowNull: false },
      nif: { field: 'nif', type: Sequelize.DataTypes.STRING, allowNull: false },
      email: { field: 'email', type: Sequelize.DataTypes.STRING },
      phone: { field: 'phone', type: Sequelize.DataTypes.STRING },
      address: { field: 'address', type: Sequelize.DataTypes.STRING, allowNull: false },
      post_code: { field: 'post_code', type: Sequelize.DataTypes.STRING },
      city: { field: 'city', type: Sequelize.DataTypes.STRING },
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
      payment_method: {
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
      comments: { field: 'comments', type: Sequelize.DataTypes.TEXT },
      user_name: { field: 'user_name', type: Sequelize.DataTypes.STRING },
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
    // Borrado de tipos ENUM (importante en PostgreSQL)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_category";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_type_invoice";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_rectification_type";');
  }
};
