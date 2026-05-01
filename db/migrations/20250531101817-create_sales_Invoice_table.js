'use strict';
const { SALESINVOICE_TABLE } = require('../models/salesInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESINVOICE_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER,
      },
      // --- COLUMNA CRÍTICA PARA IMPUESTOS ---
      movementId: {
        field: 'movement_id',
        allowNull: false,
        unique: true,
        type: Sequelize.DataTypes.UUID,
        defaultValue: Sequelize.DataTypes.UUIDV4
      },
      // --------------------------------------
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
      codeposting: {
        field: 'code_posting',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      typeinvoice: {
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
        allowNull: false
      },
      dueDate: {
        field: 'due_date',
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      entityCode: {
        field: 'entity_code',
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      name: {
        field: 'name',
        type: Sequelize.DataTypes.STRING,
        allowNull: false
      },
      nif: {
        field: 'nif',
        type: Sequelize.DataTypes.STRING,
        allowNull: false
      },
      email: {
        field: 'email',
        type: Sequelize.DataTypes.STRING
      },
      phone: {
        field: 'phone',
        type: Sequelize.DataTypes.STRING
      },
      address: {
        field: 'address',
        type: Sequelize.DataTypes.STRING,
        allowNull: false
      },
      postCode: {
        field: 'post_code',
        type: Sequelize.DataTypes.STRING
      },
      city: {
        field: 'city',
        type: Sequelize.DataTypes.STRING
      },
      status: {
        field: 'status',
        type: Sequelize.DataTypes.ENUM('Abierto', 'Pagado'),
        allowNull: false,
        defaultValue: 'Abierto'
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
      amountWithoutVat: {
        field: 'amount_without_vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amountVat: {
        field: 'amount_vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amountWithVat: {
        field: 'amount_with_vat',
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      comments: {
        field: 'comments',
        type: Sequelize.DataTypes.TEXT
      },
      userName: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING
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

    // ÍNDICES PARA RENDIMIENTO
    await queryInterface.addIndex(SALESINVOICE_TABLE, ['entity_code']);
    await queryInterface.addIndex(SALESINVOICE_TABLE, ['series_code']);
    await queryInterface.addIndex(SALESINVOICE_TABLE, ['movement_id']); // Índice para DocumentTax
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(SALESINVOICE_TABLE);
    // Limpieza de tipos ENUM en Postgres
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoices_type_invoice";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoices_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoices_rectification_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoices_payment_method";');
  }
};
