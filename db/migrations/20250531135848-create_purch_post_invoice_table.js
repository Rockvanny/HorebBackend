'use strict';
const { PURCHPOSTINVOICE_TABLE } = require('../models/purchPostInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(PURCHPOSTINVOICE_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER,
      },
      movementId: {
        field: 'movement_id',
        allowNull: false,
        unique: true,
        type: Sequelize.DataTypes.UUID,
      },
      code: {
        field: 'code',
        allowNull: false,
        unique: true,
        type: Sequelize.DataTypes.STRING,
      },
      seriesCode: {
        field: 'series_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      preInvoice: {
        field: 'pre_invoice',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      typeInvoice: {
        field: 'type_invoice',
        type: Sequelize.DataTypes.ENUM('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'),
        allowNull: false,
        defaultValue: 'F1'
      },
      parentCode: {
        field: 'parent_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      rectificationType: {
        field: 'rectification_type',
        type: Sequelize.DataTypes.ENUM('S', 'I'),
        allowNull: true
      },
      budgetCode: {
        field: 'budget_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      postingDate: {
        field: 'posting_date',
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
      },
      dueDate: {
        field: 'due_date',
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      entityCode: {
        field: 'entity_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      name: { field: 'name', type: Sequelize.DataTypes.STRING, allowNull: false },
      nif: { field: 'nif', type: Sequelize.DataTypes.STRING, allowNull: false },
      email: { field: 'email', type: Sequelize.DataTypes.STRING },
      phone: { field: 'phone', type: Sequelize.DataTypes.STRING },
      address: { field: 'address', type: Sequelize.DataTypes.STRING, allowNull: false },
      postCode: { field: 'post_code', type: Sequelize.DataTypes.STRING },
      city: { field: 'city', type: Sequelize.DataTypes.STRING },
      status: {
        field: 'status',
        type: Sequelize.DataTypes.ENUM('Abierto', 'Pagado'),
        allowNull: false,
        defaultValue: 'Abierto'
      },
      paymentMethod: {
        field: 'payment_method',
        type: Sequelize.DataTypes.ENUM('Transferencia', 'Efectivo', 'Tarjeta', 'Bizum'),
        allowNull: false,
        defaultValue: 'Transferencia'
      },
      category: {
        field: 'category',
        type: Sequelize.DataTypes.ENUM(
          'Suministros de Obra',
          'Logística de Materiales',
          'Material de Construcción',
          'Equipamiento / Maquinaria',
          'Servicios Externos de Obra'
        ),
        allowNull: true,
        defaultValue: 'Suministros de Obra'
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
      userName: { field: 'user_name', type: Sequelize.DataTypes.STRING },
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

    await queryInterface.addIndex(PURCHPOSTINVOICE_TABLE, ['code']);
    await queryInterface.addIndex(PURCHPOSTINVOICE_TABLE, ['entity_code']);
    await queryInterface.addIndex(PURCHPOSTINVOICE_TABLE, ['movement_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(PURCHPOSTINVOICE_TABLE);
    // Limpieza de ENUMS para evitar conflictos en Postgres
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_post_invoices_type_invoice";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_post_invoices_rectification_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_post_invoices_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_post_invoices_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_post_invoices_category";');
  }
};
