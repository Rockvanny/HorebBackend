const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const PURCHPOSTINVOICE_TABLE = 'purch_post_invoices';

const purchPostInvoiceSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },

  movementId: {
    field: 'movement_id',
    allowNull: false,
    unique: true,
    type: DataTypes.UUID // Heredado del borrador para trazabilidad única
  },

  code: {
    field: 'code',
    allowNull: false,
    unique: true,
    type: DataTypes.STRING
  },

  seriesCode: {
    field: 'series_code',
    type: DataTypes.STRING,
    allowNull: true
  },

  preInvoice: {
    field: 'pre_invoice',
    allowNull: false,
    type: DataTypes.STRING
  },

  // Adaptado a tipos de factura de compra si fuera necesario, o mantenido por simetría
  typeInvoice: {
    field: 'type_invoice',
    type: DataTypes.ENUM('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'),
    allowNull: false,
    defaultValue: 'F1'
  },

  parentCode: {
    field: 'parent_code',
    type: DataTypes.STRING,
    allowNull: true
  },

  rectificationType: {
    field: 'rectification_type',
    type: DataTypes.ENUM('S', 'I'),
    allowNull: true
  },

  budgetCode: {
    field: 'budget_code',
    type: DataTypes.STRING,
    allowNull: true
  },

  vendorCode: { // Equivalente a entityCode en ventas
    field: 'vendor_code',
    type: DataTypes.STRING,
    allowNull: false
  },

  postingDate: {
    field: 'posting_date',
    type: DataTypes.DATE,
    allowNull: false
  },

  dueDate: {
    field: 'due_date',
    type: DataTypes.DATE,
    allowNull: true
  },

  name: {
    field: 'name',
    type: DataTypes.STRING,
    allowNull: false
  },

  nif: { // Importante para el histórico fiscal
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

  paymentMethod: {
    field: 'payment_method',
    type: DataTypes.ENUM('Transferencia', 'Efectivo', 'Tarjeta', 'Bizum'),
    allowNull: false,
    defaultValue: 'Transferencia'
  },

  category: { // Específico de compras para analítica de gastos
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

  userName: {
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

class purchPostInvoice extends Model {
  static associate(models) {
    // Relación con Proveedor
    this.belongsTo(models.Vendor, { as: 'vendor', foreignKey: 'vendor_code' });

    // Relación con Líneas de Histórico (Importante: sourceKey 'code')
    this.hasMany(models.purchPostInvoiceLine, {
      as: 'lines',
      foreignKey: 'codeDocument',
      sourceKey: 'code',
      onDelete: 'CASCADE'
    });

    // Asociación con desglose de impuestos (Simetría con ventas)
    this.hasMany(models.DocumentTax, {
      as: 'taxes',
      foreignKey: 'movementId',
      sourceKey: 'movementId',
      scope: { codeDocument: 'purchpostinvoices' }
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHPOSTINVOICE_TABLE,
      modelName: 'purchPostInvoice',
      timestamps: true,
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

module.exports = { purchPostInvoice, purchPostInvoiceSchema, PURCHPOSTINVOICE_TABLE };
