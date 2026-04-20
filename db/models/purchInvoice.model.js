const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const PURCHINVOICE_TABLE = 'purch_invoices';

const purchInvoiceSchema = {
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  codePosting: {
    field: 'code_posting', // Sincronizado con el campo de la migración
    type: DataTypes.STRING,
    allowNull: true
  },
  budgetCode: {
    field: 'budget_code', // Sincronizado con el campo de la migración
    type: DataTypes.STRING,
    allowNull: true
  },
  postingDate: {
    field: 'posting_date',
    type: DataTypes.DATE,
    allowNull: false // Obligatorio según migración y ley
  },
  dueDate: {
    field: 'due_date',
    type: DataTypes.DATE,
    allowNull: true
  },
  entityCode: {
    field: 'entity_code',
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    field: 'name',
    type: DataTypes.STRING,
    allowNull: false
  },
  nif: {
    field: 'nif',
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    field: 'email',
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    field: 'phone',
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    field: 'address',
    type: DataTypes.STRING,
    allowNull: false
  },
  postCode: {
    field: 'post_code',
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    field: 'city',
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    field: 'status',
    type: DataTypes.ENUM('Abierto', 'Pagado'),
    allowNull: false,
    defaultValue: 'Abierto'
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
  paymentMethod: {
    field: 'payment_method',
    type: DataTypes.ENUM('Tarjeta', 'Efectivo', 'Transferencia'),
    allowNull: false,
    defaultValue: 'Tarjeta'
  },
  amountWithoutVAT: {
    field: 'amount_without_vat',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  amountVAT: {
    field: 'amount_vat',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  amountWithVAT: {
    field: 'amount_with_vat',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  comments: {
    field: 'comments',
    type: DataTypes.TEXT,
    allowNull: true
  },
  username: {
    field: 'user_name',
    type: DataTypes.STRING,
    allowNull: true
  },
  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  },
  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
};

class purchInvoice extends Model {
  static associate(models) {
    this.belongsTo(models.Vendor, {
      as: 'vendor',
      foreignKey: 'entity_code'
    });

    this.hasMany(models.purchInvoiceLine, {
      as: 'lines',
      foreignKey: 'codeDocument',
      sourceKey: 'code',
      onDelete: 'CASCADE',
      hooks: true
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHINVOICE_TABLE,
      modelName: 'purchInvoice',
      timestamps: false,
      underscored: true,
      hooks: {
        beforeValidate: async (instance, options) => {
          if (instance.isNewRecord && !instance.code) {
            await generateNextCode(instance, options);
          }
        }
      }
    };
  }
}

module.exports = { purchInvoice, purchInvoiceSchema, PURCHINVOICE_TABLE };
