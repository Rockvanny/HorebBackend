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
      movementId: {
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
      seriesCode: {
        field: 'series_code',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
      },
      codePosting: {
        field: 'code_posting',
        type: Sequelize.DataTypes.STRING,
        allowNull: true
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
        allowNull: false
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
      category: {
        field: 'category',
        type: Sequelize.DataTypes.ENUM(
          'Materiales', 'Subcontratas', 'Personal y Nóminas',
          'Herramientas y Alquileres', 'Vehículos y Movilidad', 'Gastos de Oficina y Varios'
        ),
        allowNull: false,
        defaultValue: 'Gastos de Oficina y Varios'
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

    // ÍNDICES PARA RENDIMIENTO (Igual que en Ventas)
    await queryInterface.addIndex(PURCHINVOICE_TABLE, ['entity_code']);
    await queryInterface.addIndex(PURCHINVOICE_TABLE, ['series_code']);
    await queryInterface.addIndex(PURCHINVOICE_TABLE, ['movement_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable(PURCHINVOICE_TABLE);

    // Borrado de tipos ENUM específicos de compras
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_payment_method";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_category";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_type_invoice";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_purch_invoices_rectification_type";');
  }
};
