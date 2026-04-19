'use strict';

const { SALESINVOICE_TABLE } = require('../models/salesInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESINVOICE_TABLE, {
      code: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      code_posting: {
        type: Sequelize.DataTypes.STRING
      },
      // NUEVO: Tipo de factura (Normativa Verifactu)
      type_invoice: {
        type: Sequelize.DataTypes.ENUM('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'),
        allowNull: false,
        defaultValue: 'F1'
      },
      // NUEVO: Referencia a factura origen (Para rectificativas)
      parent_code: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      budget_code: {
        type: Sequelize.DataTypes.STRING
      },
      posting_date: {
        type: Sequelize.DataTypes.DATE,
      },
      due_date: {
        type: Sequelize.DataTypes.DATE,
      },
      customer_code: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
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
      payment_method: {
        field: 'payment_method',
        type: Sequelize.DataTypes.STRING,
      },
      status: {
        type: Sequelize.DataTypes.ENUM('Abierto', 'Pagado'),
        allowNull: false,
        defaultValue: 'Abierto'
      },
      // TOTALES NORMALIZADOS A 4 DECIMALES (12, 4)
      amount_without_vat: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        defaultValue: 0.0000
      },
      amount_vat: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        defaultValue: 0.0000
      },
      amount_with_vat: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        defaultValue: 0.0000
      },
      comments: {
        type: Sequelize.DataTypes.TEXT,
      },
      user_name: {
        field: 'user_name',
        type: Sequelize.DataTypes.STRING,
      },
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

    // Opcional: Borrar el tipo ENUM manualmente si usas Postgres y da problemas al revertir
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoices_type_invoice";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sales_invoices_status";');
  }
};
