'use strict';
const { DataTypes, literal } = require('sequelize');
const { COMPANY_TABLE } = require('../models/company.model');

module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable(COMPANY_TABLE, {
      id: {
        field: 'id',
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },

      logo_base64: {
        field: 'logo',
        type: DataTypes.TEXT,
      },

      // Nuevo campo para la imagen de la firma
      signature_base64: {
        field: 'signature',
        type: DataTypes.TEXT,
      },

      name: {
        field: 'name',
        type: DataTypes.STRING,
      },

      vatRegistration: {
        field: 'vat_registration',
        type: DataTypes.STRING,
      },

      email: {
        field: 'email',
        type: DataTypes.STRING,
      },

      phone: {
        field: 'phone',
        type: DataTypes.STRING,
      },

      address: {
        field: 'address',
        type: DataTypes.STRING,
      },

      postCode: {
        field: 'post_code',
        type: DataTypes.STRING,
      },

      city: {
        field: 'city',
        type: DataTypes.STRING,
      },

      // Reemplazo de 'bank' por 'bank_name'
      bankName: {
        field: 'bank_name',
        type: DataTypes.STRING,
      },

      // Reemplazo de 'account_bank' por 'iban'
      iban: {
        field: 'iban',
        type: DataTypes.STRING,
      },

      // Nuevo campo para transferencias internacionales
      swift: {
        field: 'swift',
        type: DataTypes.STRING(11),
      },

      WebSite: {
        field: 'website',
        type: DataTypes.STRING,
      },

      footerText: {
        field: 'footer_text',
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
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable(COMPANY_TABLE);
  }
};
