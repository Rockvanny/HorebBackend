'use strict';
const { COMPANY_TABLE } = require('./../models/company.model');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(COMPANY_TABLE, {
      id: {
        field: 'id',
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },

      logo_base64: {
        field: "logo",
        type: Sequelize.DataTypes.TEXT,
      },

      // Nuevo campo para la imagen de la firma
      signature_base64: {
        field: "signature",
        type: Sequelize.DataTypes.TEXT,
      },

      name: {
        field: 'name',
        type: Sequelize.DataTypes.STRING,
      },

      vatRegistration: {
        field: 'vat_registration',
        type: Sequelize.DataTypes.STRING,
      },

      email: {
        field: 'email',
        type: Sequelize.DataTypes.STRING,
      },

      phone: {
        field: 'phone',
        type: Sequelize.DataTypes.STRING,
      },

      address: {
        field: 'address',
        type: Sequelize.DataTypes.STRING,
      },

      postCode: {
        field: 'post_code',
        type: Sequelize.DataTypes.STRING,
      },

      city: {
        field: 'city',
        type: Sequelize.DataTypes.STRING,
      },

      // Reemplazo de 'bank' por 'bank_name'
      bankName: {
        field: 'bank_name',
        type: Sequelize.DataTypes.STRING,
      },

      // Reemplazo de 'account_bank' por 'iban'
      iban: {
        field: 'iban',
        type: Sequelize.DataTypes.STRING,
      },

      // Nuevo campo para transferencias internacionales
      swift: {
        field: 'swift',
        type: Sequelize.DataTypes.STRING(11),
      },

      WebSite: {
        field: 'website',
        type: Sequelize.DataTypes.STRING,
      },

      footerText: {
        field: 'footer_text',
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(COMPANY_TABLE);
  }
};
