'use strict';
const { DataTypes, literal } = require('sequelize');

const DOCUMENT_TAX_TABLE = 'document_taxes';

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(DOCUMENT_TAX_TABLE, {
      id: {
        field: 'id',
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      codeDocument: {
        field: 'code_document',
        allowNull: false,
        type: DataTypes.ENUM('budget', 'salesinvoice', 'salespostinvoices', 'purchinvoice', 'purchpostinvoices'),
      },
      // CAMBIO CLAVE: De INTEGER a UUID para el traspaso entre tablas
      movementId: {
        field: 'movement_id',
        allowNull: false,
        type: DataTypes.UUID,
      },
      taxType: {
        field: 'tax_type',
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'IVA'
      },
      taxPercentage: {
        field: 'tax_percentage',
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      taxableAmount: {
        field: 'taxable_amount',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      taxAmount: {
        field: 'tax_amount',
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000
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

    // Actualización de Índices para usar movement_id
    await queryInterface.addIndex(DOCUMENT_TAX_TABLE, ['code_document', 'movement_id']);

    // Índice único para evitar duplicar el mismo % de IVA en un mismo movimiento
    await queryInterface.addIndex(DOCUMENT_TAX_TABLE, ['code_document', 'movement_id', 'tax_percentage'], {
      unique: true,
      name: 'unique_tax_per_doc'
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(DOCUMENT_TAX_TABLE);
    // Limpieza del ENUM generado en Postgres al revertir
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_document_taxes_code_document";');
  }
};
