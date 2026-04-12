const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../libs/sequence.handler');

const VENDOR_TABLE = 'vendors';

const VendorSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },

  name: {
    field: 'name',
    type: DataTypes.STRING,
  },

  nif: {
    field: 'nif',
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

  category: {
    field: 'category',
    type: DataTypes.ENUM(
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

  username: {
    field: 'user_name',
    type: DataTypes.STRING,
  },

  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE
  },

  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE,
  },

  deleteAt: {
    field: 'delete_at',
    allowNull: true,
    type: DataTypes.DATE
  }
}

class Vendor extends Model {
  static associate(models) {
    // Un proveedor (Vendor) tiene muchas facturas.
    this.hasMany(models.purchInvoice, {
      as: 'purchInvoice',
      foreignKey: 'vendor_code'
    });

    // Un proveedor (Vendor) tiene muchas facturas registradas.
    this.hasMany(models.purchpostInvoice, {
      as: 'purchpostInvoice',
      foreignKey: 'vendor_code'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: VENDOR_TABLE,
      modelName: 'Vendor',
      timestamps: true,
      underscored: true,
      paranoid: true,
      deletedAt: 'deleteAt',
      beforeValidate: async (instance, options) => {
        // Solo actuamos si es un registro nuevo (Creación)
        if (instance.isNewRecord) {
          // Pasamos la instancia y las opciones (que traen la transacción)
          await generateNextCode(instance, options);
        }

      }
    }
  }
}

module.exports = { Vendor, VendorSchema, VENDOR_TABLE };
