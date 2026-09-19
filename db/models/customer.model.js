const { Model, DataTypes, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const { generateNextCode } = require('../../libs/sequence.handler');

const CUSTOMER_TABLE = 'customers';

const CustomerSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },

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

  // Autoservicio desde la app móvil (ver customers.service.js#registerAccount):
  // null hasta que el propio cliente se registra encima de su fila ya
  // existente (verificado por NIF+email). Nunca se crea con contraseña desde
  // la ficha de cliente que usa el personal interno.
  password: {
    field: 'password',
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Interruptor de acceso a la app móvil: es el personal interno quien lo
  // activa desde la ficha de cliente (Frontend), nunca el propio cliente.
  // Por defecto false a propósito -alta explícita, no un permiso implícito
  // por existir en la tabla-, se valida en registerAccount/login/
  // verifyLoginOtp (ver customers.service.js) para bloquear tanto el alta
  // de cuenta como el login de un cliente sin acceso concedido.
  appAccessEnabled: {
    field: 'app_access_enabled',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
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

class Customer extends Model {
  static associate(models) {
    // Un proveedor (cliente) tiene muchas ofertas.
    this.hasMany(models.salesBudget, {
      as: 'salesBudget',
      foreignKey: 'entity_code'
    });

    this.hasMany(models.salesInvoice, {
      as: 'salesInvoice',
      foreignKey: 'entity_code'
    });

    this.hasMany(models.salesPostInvoice, {
      as: 'salesPostInvoice',
      foreignKey: 'entity_code'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: CUSTOMER_TABLE,
      modelName: 'Customer',
      timestamps: true,
      underscored: true,
      paranoid: true,
      deletedAt: 'deleteAt',
      hooks: {
        beforeValidate: async (customer, options) => {
          await generateNextCode(customer, options);
        },
        // Mismo patrón que user.model.js: hashear solo si viene/cambia en claro.
        beforeCreate: async (customer) => {
          if (customer.password) {
            customer.password = await bcrypt.hash(customer.password, 10);
          }
        },
        beforeUpdate: async (customer) => {
          if (customer.changed('password') && customer.password) {
            customer.password = await bcrypt.hash(customer.password, 10);
          }
        }
      }
    }
  }
}

module.exports = { Customer, CustomerSchema, CUSTOMER_TABLE };
