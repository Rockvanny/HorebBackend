const { types } = require('joi');
const { Model, DataTypes, Sequelize } = require('sequelize');

const COMPANY_TABLE = 'company';

const CompanySchema = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  logo_base64: { // Campo para el logo Base64
    field: "logo",
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

  bankName: {
    field: 'bank_name', // Mantenemos el mapeo a la columna de la DB si es necesario
    type: DataTypes.STRING,
  },

  iban: {
    field: 'iban',
    type: DataTypes.STRING,
  },

  swift: {
    field: 'swift',
    type: DataTypes.STRING,
  },

  signature_base64: {
    field: "signature",
    type: DataTypes.TEXT,
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
  },

  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE
  }
}

class Company extends Model {

  static associate(models) { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: COMPANY_TABLE,
      modelName: 'Company',
      timestamps: true,
      underscored: true
    }
  }
}

module.exports = { Company, CompanySchema, COMPANY_TABLE };
