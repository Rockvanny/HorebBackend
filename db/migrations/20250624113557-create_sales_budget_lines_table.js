'use strict';

const { SALESBUDGETLINE_TABLE } = require('../models/salesBudgetLines.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESBUDGETLINE_TABLE, {
      // CLAVE COMPUESTA: code_budget + line_no
      code_budget: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING,
        references: {
          model: 'sales_budgets', // Nombre de la tabla física
          key: 'code'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      line_no: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER,
      },
      item_code: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true, // Cambiado a true por si hay líneas de solo texto
      },
      description: {
        type: Sequelize.DataTypes.TEXT, // Cambiado a TEXT para descripciones largas
        allowNull: true,
      },
      // PRECISIÓN NORMALIZADA A 4 DECIMALES
      quantity: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      unit_measure: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'UNIDAD'
      },
      quantity_unit_measure: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      unit_price: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      vat: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 21.0000 // Por defecto el IVA estándar
      },
      amount_line: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      user_name: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
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

    // Índice de rendimiento para búsquedas de líneas por presupuesto
    await queryInterface.addIndex(SALESBUDGETLINE_TABLE, ['code_budget']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable(SALESBUDGETLINE_TABLE);
  }
};
