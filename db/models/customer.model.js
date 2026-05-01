const { Model, DataTypes, Sequelize } = require('sequelize');
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
        }
      }
    }
  }
}

module.exports = { Customer, CustomerSchema, CUSTOMER_TABLE };
