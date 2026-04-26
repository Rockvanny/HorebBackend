const { Model, DataTypes, Sequelize } = require('sequelize');

const PURCHPOSTINVOICELINE_TABLE = 'purch_post_invoice_lines';

const purchPostInvoiceLineSchema = {
   codeInvoice: {
    field: 'code_invoice',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING,

    references: {
      model: 'purch_post_invoices',
      key: 'code'
    },

    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },

  lineNo: {
    field: 'line_no',
    allowNull: false,
    primaryKey: true, // Parte de la clave primaria compuesta
    type: DataTypes.INTEGER,
  },

  codeItem: {
    field: 'item_code',
    allowNull: false,
    type: DataTypes.STRING,
  },

  description: {
    field: 'description',
    allowNull: true, // Asumo que la descripción puede ser opcional
    type: DataTypes.STRING
  },

  quantity: {
    field: 'quantity',
    allowNull: false,
    type: DataTypes.INTEGER,
  },

  unitMeasure: {
    field: 'unit_measure',
    type: DataTypes.ENUM('UNIDAD', 'HORA', 'DIA', 'SERVICIO', 'METRO', 'METRO2', 'KILOGRAMO', 'LITRO', 'PACK'),
    defaultValue: 'UNIDAD'
  },

  quantityUnitMeasure: {
    field:'quantity_unit_measure',
    allowNull: false,
    type: DataTypes.INTEGER,
  },

  unitPrice: {
    field: 'unit_price',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  vat: {
    field: 'vat',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  amountLine: {
    field: 'amount_line',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  username: {
    field: 'user_name',
    type: DataTypes.STRING,
  },

  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },

  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
};

class purchPostInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.purchPostInvoice, { // 'models.salesBudget' es el modelo al que pertenece
      as: 'invoice',                       // Alias para acceder a la factura regsitrada desde la línea (ej. line.budget)
      foreignKey: 'code_invoice'            // La clave foránea en ESTA tabla (purch_Invoice_lines)
    });
  }

  // Método para la configuración del modelo
  static config(sequelize) {
    return {
      sequelize,                      // Instancia de Sequelize
      tableName: PURCHPOSTINVOICELINE_TABLE, // Nombre de la tabla en la base de datos
      modelName: 'purchPostInvoiceLine',   // Nombre del modelo en Sequelize
      timestamps: true,               // Ajusta a true si quieres que Sequelize maneje createdAt y updatedAt automáticamente
      underscored: true,
      id: false,
      primaryKey: ['code_invoice', 'line_no']
    };
  }
}

module.exports = { purchPostInvoiceLine, purchPostInvoiceLineSchema, PURCHPOSTINVOICELINE_TABLE };
