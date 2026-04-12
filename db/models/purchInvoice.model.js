const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../libs/sequence.handler');

const PURCHINVOICE_TABLE = 'purch_invoices';

const purchInvoiceSchema = {
  // IDENTIFICADOR ÚNICO (Generado por Hook)
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING
  },
  // DATOS DE REGISTRO
  codePosting: {
    field: 'code_posting',
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
  // VÍNCULOS (Documentos de origen)
  budgetCode: {
    field: 'budget_code',
    type: DataTypes.STRING
  },
  // DATOS DEL CONTACTO (Vendor/Customer)
  vendorCode: {
    field: 'vendor_code',
    type: DataTypes.STRING,
  },
  name: { // Nombre genérico para mostrar en tablas
    field: 'name',
    type: DataTypes.STRING,
  },
  email: { field: 'email', type: DataTypes.STRING },
  phone: { field: 'phone', type: DataTypes.STRING },
  address: { field: 'address', type: DataTypes.STRING },
  postCode: { field: 'post_code', type: DataTypes.STRING },
  city: { field: 'city', type: DataTypes.STRING },

  // CONFIGURACIÓN Y ESTADO
  paymentMethod: {
    field: 'payment_method',
    type: DataTypes.STRING,
  },
  status: {
    field: 'status',
    type: DataTypes.STRING,
    defaultValue: 'Borrador'
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

  // TOTALES (Estandarizados para el Frontend)
  amountWithoutVAT: {
    field: 'amount_without_vat', // Corregido: todo en minúsculas
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  amountVAT: {
    field: 'amount_vat',
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  amountWithVAT: {
    field: 'amount_with_vat',
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  // AUDITORÍA
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
}

class purchInvoice extends Model {
  static associate(models) {
    this.belongsTo(models.Vendor, {
      as: 'vendor', // En minúscula para consistencia genérica
      foreignKey: 'vendor_code'
    });

    this.hasMany(models.purchInvoiceLine, {
      as: 'lines',
      foreignKey: 'codeInvoice'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHINVOICE_TABLE,
      modelName: 'purchInvoice',
      timestamps: true,
      underscored: true,
      // CORRECCIÓN: Los hooks deben ir dentro de su propio objeto
      hooks: {
        beforeValidate: async (instance, options) => {
          if (instance.isNewRecord) {
            await generateNextCode(instance, options);
          }
        }
      }
    };
  }
}

module.exports = { purchInvoice, purchInvoiceSchema, PURCHINVOICE_TABLE };
