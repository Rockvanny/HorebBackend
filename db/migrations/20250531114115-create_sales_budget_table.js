'use strict';
const { DataTypes, literal } = require('sequelize');
const { SALESBUDGET_TABLE } = require('../models/salesBudget.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(SALESBUDGET_TABLE, {
      // 1. PK Física: Para gestión interna de la DB y Sequelize
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      // 2. ADN del documento: Para unir con impuestos (UUID)
      movementId: {
        field: 'movement_id',
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4
      },
      // 3. Código correlativo visual (se mantiene único)
      code: {
        field: 'code',
        allowNull: false,
        unique: true,
        type: DataTypes.STRING
      },
      postingDate: {
        field: 'posting_date',
        type: DataTypes.DATE,
        allowNull: true
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
      name: { field: 'name', type: DataTypes.STRING },
      nif: { field: 'nif', type: DataTypes.STRING },
      email: { field: 'email', type: DataTypes.STRING },
      phone: { field: 'phone', type: DataTypes.STRING },
      address: { field: 'address', type: DataTypes.STRING },
      postCode: { field: 'post_code', type: DataTypes.STRING },
      city: { field: 'city', type: DataTypes.STRING },
      status: {
        field: 'status',
        type: DataTypes.ENUM('Borrador', 'Enviado', 'Aprobado', 'Rechazado'),
        allowNull: false,
        defaultValue: 'Borrador'
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
      comments: {
        field: 'comments',
        type: DataTypes.TEXT,
        allowNull: true
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

    // Índice para búsquedas rápidas por movimiento
    await queryInterface.addIndex(SALESBUDGET_TABLE, ['movement_id']);
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(SALESBUDGET_TABLE);
    // Limpieza de tipos ENUM para evitar errores al recrear la tabla
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_budgets_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_budgets_payment_method";');
  }
};
