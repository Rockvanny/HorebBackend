'use strict';

const { SALESBUDGETLINE_TABLE } = require('../models/salesBudgetLines.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(SALESBUDGETLINE_TABLE, {
      /**
       * CLAVE COMPUESTA NORMALIZADA
       * code_document + line_no
       */
      code_document: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.DataTypes.STRING,
        references: {
          model: 'sales_budgets', // Asegúrate de que este sea el nombre real de la tabla de cabecera
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

      // --- REFERENCIAS ---
      item_code: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },

      // --- CANTIDADES Y PRECISIÓN (DECIMAL 12,4) ---
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
        defaultValue: 1.0000 // Importante: valor 1 para evitar anulaciones en cálculos
      },

      // --- PRECIOS E IMPUESTOS ---
      unit_price: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      vat: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 21.0000
      },
      amount_line: {
        type: Sequelize.DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },

      // --- AUDITORÍA Y CONTROL ---
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

    /**
     * ÍNDICE DE RENDIMIENTO
     * Optimiza las consultas de líneas por documento (Operaciones masivas)
     */
    await queryInterface.addIndex(SALESBUDGETLINE_TABLE, ['code_document']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable(SALESBUDGETLINE_TABLE);
  }
};
