const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const PURCHINVOICE_TABLE = 'purch_invoices';

const purchInvoiceSchema = {
  code: {
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  postingDate: {
    field: 'posting_date',
    type: DataTypes.DATE,
  },
  dueDate: {
    field: 'due_date',
    type: DataTypes.DATE,
  },
  // NOMBRE AGNÓSTICO: entityCode (antes vendorCode)
  entityCode: {
    field: 'entity_code',
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: DataTypes.STRING,
  nif: DataTypes.STRING,
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  address: DataTypes.STRING,
  postCode: {
    field: 'post_code',
    type: DataTypes.STRING
  },
  city: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('Borrador', 'Abierto', 'Pagado', 'Rechazado'),
    allowNull: false,
    defaultValue: 'Borrador'
  },
  category: {
    type: DataTypes.ENUM(
      'Materiales', 'Subcontratas', 'Personal y Nóminas',
      'Herramientas y Alquileres', 'Vehículos y Movilidad', 'Gastos de Oficina y Varios'
    ),
    allowNull: true,
    defaultValue: 'Gastos de Oficina y Varios'
  },
  paymentMethod: {
    field: 'payment_method',
    type: DataTypes.STRING,
  },
  amountWithoutVAT: {
    field: 'amount_without_vat',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  amountVAT: {
    field: 'amount_vat',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  amountWithVAT: {
    field: 'amount_with_vat',
    type: DataTypes.DECIMAL(12, 4),
    defaultValue: 0.0000
  },
  comments: DataTypes.TEXT,
  username: {
    field: 'user_name',
    type: DataTypes.STRING,
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
      foreignKey: 'entity_code' // Mapeado a la entidad correspondiente
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
