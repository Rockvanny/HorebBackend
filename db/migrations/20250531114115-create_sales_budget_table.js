'use strict';
const { SALESBUDGET_TABLE } = require('../models/salesBudget.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESBUDGET_TABLE, {
      // 1. PK Física: Para gestión interna de la DB y Sequelize
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER
      },
      // 2. ADN del documento: Para unir con impuestos (UUID)
      movementId: {
        field: 'movement_id',
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
        unique: true
      },
      // 3. Código correlativo visual (se mantiene único)
      code: {
        field: 'code',
        allowNull: false,
        unique: true,
        type: Sequelize.DataTypes.STRING
      },
      postingDate: {
        field: 'posting_date',
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      dueDate: {
        field: 'due_date',
        type: Sequelize.DataTypes.DATE,
        allowNull: true
      },
      entityCode: {
        field: 'entity_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      name: { field: 'name', type: Sequelize.DataTypes.STRING },
      nif: { field: 'nif', type: Sequelize.DataTypes.STRING },
      email: { field: 'email', type: Sequelize.DataTypes.STRING },
      phone: { field: 'phone', type: Sequelize.DataTypes.STRING },
      address: { field: 'address', type: Sequelize.DataTypes.STRING },
      postCode: { field: 'post_code', type: Sequelize.DataTypes.STRING },
      city: { field: 'city', type: Sequelize.DataTypes.STRING },
      status: {
        field: 'status',
        type: Sequelize.DataTypes.ENUM('Borrador', 'Enviado', 'Aprobado', 'Rechazado'),
        allowNull: false,
        defaultValue: 'Borrador'
      },
      comments: {
        field: 'comments',
        type: Sequelize.DataTypes.TEXT,
        allowNull: true
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
      userName: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
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

    // Índice para búsquedas rápidas por movimiento
    await queryInterface.addIndex(SALESBUDGET_TABLE, ['movement_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(SALESBUDGET_TABLE);
    // Limpieza de tipos ENUM para evitar errores al recrear la tabla
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_budgets_status";');
  }
};
