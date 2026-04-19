'use strict';

const { PURCHINVOICE_TABLE } = require('../models/purchInvoice.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(PURCHINVOICE_TABLE, {
      code: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING
      },
      code_posting: {
        type: Sequelize.DataTypes.STRING
      },
      budget_code: {
        type: Sequelize.DataTypes.STRING
      },
      posting_date: {
        type: Sequelize.DataTypes.DATE, // Sincronizado con DATE del modelo
      },
      due_date: {
        type: Sequelize.DataTypes.DATE, // Sincronizado con DATE del modelo
      },
      vendor_code: {
        allowNull: false,
        type: Sequelize.DataTypes.STRING,
      },
      name: {
        type: Sequelize.DataTypes.STRING,
      },
      nif: { // Añadido para consistencia con el modelo
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
        type: Sequelize.DataTypes.STRING,
      },
      city: {
        type: Sequelize.DataTypes.STRING,
      },
      payment_method: {
        type: Sequelize.DataTypes.STRING,
      },
      status: {
        type: Sequelize.DataTypes.ENUM('Abierto', 'Pagado'), // ENUM real en DB
        allowNull: false,
        defaultValue: 'Abierto'
      },
      category: {
        type: Sequelize.DataTypes.ENUM(
          'Materiales',
          'Subcontratas',
          'Personal y Nóminas',
          'Herramientas y Alquileres',
          'Vehículos y Movilidad',
          'Gastos de Oficina y Varios'
        ),
        allowNull: true,
        defaultValue: 'Gastos de Oficina y Varios'
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
      comments: { // Añadido para consistencia
        type: Sequelize.DataTypes.TEXT,
      },
      user_name: {
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
    await queryInterface.dropTable(PURCHINVOICE_TABLE);
  }
};
