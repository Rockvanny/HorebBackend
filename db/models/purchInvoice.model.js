const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const PURCHINVOICE_TABLE = 'purch_invoices';

const purchInvoiceSchema = {
  code: {
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  // Campos específicos de registro
  codePosting: {
    field: 'code_posting',
    type: DataTypes.STRING
  },
  budgetCode: {
    field: 'budget_code',
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
  // Datos del Proveedor (Igualamos estructura al base)
  vendorCode: {
    field: 'vendor_code',
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: DataTypes.STRING,
  nif: DataTypes.STRING, // Añadido para consistencia
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  address: DataTypes.STRING,
  postCode: {
    field: 'post_code',
    type: DataTypes.STRING
  },
  city: DataTypes.STRING,

  // Configuración y Estado
  paymentMethod: {
    field: 'payment_method',
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('Abierto', 'Pagado'),
    allowNull: false,
    defaultValue: 'Abierto'
  },
  category: {
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

  // TOTALES NORMALIZADOS A 4 DECIMALES (Consistencia absoluta)
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

  comments: DataTypes.TEXT, // Añadido para consistencia con el base
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
      foreignKey: 'vendor_code'
    });

    this.hasMany(models.purchInvoiceLine, {
      as: 'lines',
      foreignKey: 'codeDocument', // Estandarizado a codeDocument
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
      timestamps: false, // Usamos nuestros propios campos de auditoría
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
