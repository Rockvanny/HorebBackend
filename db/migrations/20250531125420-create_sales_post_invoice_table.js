'use strict';

const { SALESPOSTINVOICE_TABLE } = require('../models/salesPostInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESPOSTINVOICE_TABLE, {
      code: {
        field: 'code',
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      preInvoice: {
        field: 'pre_invoice', // Normalizado a snake_case
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      // --- CAMPOS VERI*FACTU ---
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
      // -------------------------
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
      budgetCode: {
        field: 'budget_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      entityCode: {
        field: 'entity_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      name: {
        field: 'name',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      nif: {
        field: 'nif',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      email: {
        field: 'email',
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        field: 'phone',
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      address: {
        field: 'address',
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      postCode: {
        field: 'post_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      city: {
        field: 'city',
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
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
      // --- IMPORTES CON PRECISIÓN 12,4 ---
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
      comments: {
        field: 'comments',
        type: Sequelize.DataTypes.TEXT,
        allowNull: true
      },
      username: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(SALESPOSTINVOICE_TABLE);
  }
};
