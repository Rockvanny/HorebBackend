'use strict';
const { DataTypes, literal } = require('sequelize');
const { PURCHINVOICE_TABLE } = require('../models/purchInvoice.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(PURCHINVOICE_TABLE, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      movementId: {
        field: 'movement_id',
        allowNull: false,
        unique: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      code: {
        field: 'code',
        allowNull: false,
        unique: true,
        type: DataTypes.STRING
      },
      seriesCode: {
        field: 'series_code',
        type: DataTypes.STRING,
        allowNull: true
      },
      codePosting: {
        field: 'code_posting',
        type: DataTypes.STRING,
        allowNull: true
      },
      typeInvoice: {
        field: 'type_invoice',
        type: DataTypes.ENUM('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'),
        allowNull: false,
        defaultValue: 'F1'
      },
      parentCode: {
        field: 'parent_code',
        type: DataTypes.STRING,
        allowNull: true
      },
      rectificationType: {
        field: 'rectification_type',
        type: DataTypes.ENUM('S', 'I'),
        allowNull: true
      },
      budgetCode: {
        field: 'budget_code',
        type: DataTypes.STRING,
        allowNull: true
      },
      postingDate: {
        field: 'posting_date',
        type: DataTypes.DATE,
        allowNull: false
      },
      dueDate: {
        field: 'due_date',
        type: DataTypes.DATE,
        allowNull: true
      },
      entityCode: {
        field: 'entity_code',
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: { field: 'name', type: DataTypes.STRING, allowNull: false },
      nif: { field: 'nif', type: DataTypes.STRING, allowNull: false },
      email: { field: 'email', type: DataTypes.STRING },
      phone: { field: 'phone', type: DataTypes.STRING },
      address: { field: 'address', type: DataTypes.STRING, allowNull: false },
      postCode: { field: 'post_code', type: DataTypes.STRING },
      city: { field: 'city', type: DataTypes.STRING },
      status: {
        field: 'status',
        type: DataTypes.ENUM('Abierto', 'Pagado'),
        allowNull: false,
        defaultValue: 'Abierto'
      },
      category: {
        field: 'category',
        type: DataTypes.ENUM(
          'Suministros de Obra',
          'Logística de Materiales',
          'Material de Construcción',
          'Equipamiento / Maquinaria',
          'Servicios Externos de Obra'
        ),
        allowNull: false,
        defaultValue: 'Suministros de Obra'
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
      amountWithoutVAT: {
        field: 'amount_without_vat',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amountVAT: {
        field: 'amount_vat',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      amountWithVAT: {
        field: 'amount_with_vat',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      comments: { field: 'comments', type: DataTypes.TEXT },
      userName: { field: 'user_name', type: DataTypes.STRING },
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

    // ÍNDICES PARA RENDIMIENTO (Igual que en Ventas)
    await queryInterface.addIndex(PURCHINVOICE_TABLE, ['entity_code']);
    await queryInterface.addIndex(PURCHINVOICE_TABLE, ['series_code']);
    await queryInterface.addIndex(PURCHINVOICE_TABLE, ['movement_id']);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(PURCHINVOICE_TABLE);

    // Borrado de tipos ENUM específicos de compras
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_category";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_type_invoice";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_rectification_type";');
  }
};
