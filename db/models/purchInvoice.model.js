const { Model, DataTypes, Sequelize } = require('sequelize');
const { generateNextCode } = require('../../libs/sequence.handler');

const PURCHINVOICE_TABLE = 'purch_invoices';

const purchInvoiceSchema = {
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
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4
  },

  // Campo virtual para recibir la serie desde el front sin persistir en DB
  // (mismo patrón que Customer/Vendor/salesInvoice, ver
  // libs/sequence.handler.js). Al registrar (archiveInvoice), seriesCode ya
  // viene relleno desde codePosting, así que este campo solo importa al
  // crear la factura directamente.
  selectedSerie: {
    type: DataTypes.VIRTUAL,
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

  codePosting: {
    field: 'code_posting',
    type: DataTypes.STRING,
    allowNull: true
  },

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

  entityCode: {
    field: 'entity_code',
    type: DataTypes.STRING,
    allowNull: false
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

  province: {
    field: 'province',
    type: DataTypes.STRING,
    allowNull: true
  },

  status: {
    field: 'status',
    type: DataTypes.ENUM('Abierto', 'Pagado'),
    allowNull: false,
    defaultValue: 'Abierto'
  },

  // Mismo enum que Vendor.category (ver db/models/vendor.model.js): la
  // categoría del gasto se elige por factura, no se copia del proveedor,
  // pero debe cubrir tanto compras de obra como gasto interno recurrente
  // facturado a través de un proveedor (luz, alquiler...).
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
    type: Sequelize.DataTypes.ENUM(
      'Transferencia',
      'Efectivo',
      'Tarjeta',
      'Bizum',
    ),
    allowNull: false,
    defaultValue: 'Transferencia'
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

class purchInvoice extends Model {
  static associate(models) {
    // Apunta a Vendor en lugar de Customer
    this.belongsTo(models.Vendor, { as: 'vendor', foreignKey: 'entityCode', targetKey: 'code' });

    this.hasMany(models.purchInvoiceLine, {
      as: 'lines',
      foreignKey: 'codeDocument',
      sourceKey: 'code',
      onDelete: 'CASCADE',
      hooks: true
    });

    this.hasMany(models.DocumentTax, {
      as: 'taxes',
      foreignKey: 'movementId',
      sourceKey: 'movementId',
      scope: { codeDocument: 'purchinvoice' }
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHINVOICE_TABLE,
      modelName: 'purchInvoice',
      timestamps: true,
      underscored: true,
      hooks: {
        beforeValidate: async (instance, options) => {
          if (instance.isNewRecord && !instance.code) {
            // Persistimos la serie borrador usada para poder consultar en vivo
            // su postingSerie vigente al registrar (ver archiveInvoice).
            if (!instance.seriesCode && instance.selectedSerie) {
              instance.seriesCode = instance.selectedSerie;
            }
            await generateNextCode(instance, options);
          }
        },
        afterDestroy: async (instance, options) => {
          const { DocumentTax } = sequelize.models;
          await DocumentTax.destroy({
            where: { movementId: instance.movementId, codeDocument: 'purchinvoice' },
            transaction: options.transaction
          });
        }
      }
    };
  }
}

module.exports = { purchInvoice, purchInvoiceSchema, PURCHINVOICE_TABLE };
