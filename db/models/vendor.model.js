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

  // Nullable a propósito, a diferencia del resto de campos de dirección:
  // es un dato nuevo (ver migración) y las filas existentes no lo tienen.
  // Se rellena como sugerencia opcional desde el código postal (ver
  // postalCodeSuggestion.js en el frontend), nunca es obligatorio.
  province: {
    field: 'province',
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Compartido byte a byte con OperatingExpensesSchema.category (mismo enum
  // en Postgres, ver migración 20260914195102-align_vendor_category_enum):
  // un proveedor se usa tanto para compras de obra como para gasto interno
  // recurrente (luz, alquiler, nóminas...), así que necesita las categorías
  // de ambos mundos para poder clasificarse correctamente en cualquiera.
  category: {
    field: 'category',
    type: DataTypes.ENUM(
      'Suministros de Obra',
      'Logística de Materiales',
      'Material de Construcción',
      'Equipamiento / Maquinaria',
      'Servicios Externos de Obra',
      'Suministros Públicos',
      'Alquileres e Inmuebles',
      'Vehículos y Movilidad',
      'Herramientas de Empresa',
      'Personal y Nóminas',
      'Gastos de Oficina y Administración'
    ),
    allowNull: false,
    defaultValue: 'Suministros de Obra'
  },

  paymentMethod: {
    field: 'payment_method',
    type: DataTypes.ENUM(
      'Transferencia',
      'Efectivo',
      'Tarjeta',
      'Bizum',
    ),
    allowNull: false,
    defaultValue: 'Transferencia'
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
      foreignKey: 'entity_code'
    });

    this.hasMany(models.purchPostInvoice, {
      as: 'purchPostInvoice', // Corregido CamelCase para consistencia
      foreignKey: 'entity_code'
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
