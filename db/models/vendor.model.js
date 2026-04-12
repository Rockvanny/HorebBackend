const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const VENDOR_TABLE = 'vendors';

const VendorSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },

  // Campo virtual para recibir la serie desde el front sin persistir en DB
  selectedSerie: {
    type: DataTypes.VIRTUAL,
  },

  name: {
    field: 'name',
    type: DataTypes.STRING,
    allowNull: false,
  },

  nif: {
    field: 'nif',
    type: DataTypes.STRING,
    allowNull: false,
  },

  email: {
    field: 'email',
    type: DataTypes.STRING,
    allowNull: false,
  },

  phone: {
    field: 'phone',
    type: DataTypes.STRING,
    allowNull: false,
  },

  address: {
    field: 'address',
    type: DataTypes.STRING,
    allowNull: false,
  },

  postCode: {
    field: 'post_code',
    type: DataTypes.STRING,
    allowNull: false,
  },

  city: {
    field: 'city',
    type: DataTypes.STRING,
    allowNull: false,
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
    allowNull: false,
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
    type: DataTypes.DATE
  },

  deleteAt: {
    field: 'delete_at',
    allowNull: true,
    type: DataTypes.DATE
  }
}

class Vendor extends Model {
  static associate(models) {
    this.hasMany(models.purchInvoice, {
      as: 'purchInvoice',
      foreignKey: 'vendor_code'
    });

    this.hasMany(models.purchPostInvoice, {
      as: 'purchPostInvoice', // Corregido CamelCase para consistencia
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
      hooks: {
        beforeValidate: async (vendor, options) => {
          await generateNextCode(vendor, options);
        }
      }
    }
  }
}

module.exports = { Vendor, VendorSchema, VENDOR_TABLE };
