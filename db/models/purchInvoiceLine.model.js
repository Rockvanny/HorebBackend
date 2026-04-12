const { Model, DataTypes, Sequelize } = require('sequelize');

const PURCHINVOICELINE_TABLE = 'purch_invoice_lines';

const purchInvoiceLineSchema = {
  // CLAVE COMPUESTA (Estandarizada)
  codeInvoice: {
    field: 'code_invoice',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING,
    references: {
      model: 'purch_invoices',
      key: 'code'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  lineNo: {
    field: 'line_no',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.INTEGER,
  },

  // DATOS DEL PRODUCTO/SERVICIO
  codeItem: {
    field: 'item_code',
    allowNull: false,
    type: DataTypes.STRING,
  },
  description: {
    field: 'description',
    type: DataTypes.STRING
  },

  // CANTIDADES Y MEDIDAS
  quantity: {
    field: 'quantity',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2), // Cambiado a DECIMAL por si hay kilos/metros
    defaultValue: 0.00
  },
  unitMeasure: {
    field: 'unit_measure',
    allowNull: false,
    type: DataTypes.STRING,
    defaultValue: 'UNIDAD'
  },
  // Si quantityUnitMeasure es lógica de negocio interna, la mantenemos
  quantityUnitMeasure: {
    field: 'quantity_unit_measure',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },

  // PRECIOS E IMPUESTOS
  unitPrice: {
    field: 'unit_price',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  vat: { // Porcentaje (ej: 21.00)
    field: 'vat',
    allowNull: false,
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  amountLine: { // Base imponible de la línea (quantity * unitPrice)
    field: 'amount_line',
    allowNull: false,
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
    defaultValue: Sequelize.NOW,
  },
  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW
  }
};

class purchInvoiceLine extends Model {
  static associate(models) {
    this.belongsTo(models.purchInvoice, {
      as: 'invoice',
      foreignKey: 'codeInvoice'
    });
  }

  // MÉTODO ESTÁTICO DE RECÁLCULO
  static async updateInvoiceTotals(codeInvoice, transaction) {
    const { purchInvoice } = this.sequelize.models;

    const lines = await this.findAll({
      where: { codeInvoice },
      transaction
    });

    const totals = lines.reduce((acc, line) => {
      const base = parseFloat(line.amountLine) || 0;
      const vatPercent = parseFloat(line.vat) || 0;
      const vatAmount = base * (vatPercent / 100);

      acc.baseTotal += base;
      acc.vatTotal += vatAmount;
      return acc;
    }, { baseTotal: 0, vatTotal: 0 });

    await purchInvoice.update({
      amountWithoutVAT: totals.baseTotal,
      amountVAT: totals.vatTotal,
      amountWithVAT: totals.baseTotal + totals.vatTotal
    }, {
      where: { code: codeInvoice },
      transaction
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: PURCHINVOICELINE_TABLE,
      modelName: 'purchInvoiceLine',
      timestamps: true,
      underscored: true,
      hooks: {
        afterSave: async (line, options) => {
          await this.updateInvoiceTotals(line.codeInvoice, options.transaction);
        },
        afterDestroy: async (line, options) => {
          await this.updateInvoiceTotals(line.codeInvoice, options.transaction);
        }
      }
    };
  }
}

module.exports = { purchInvoiceLine, purchInvoiceLineSchema, PURCHINVOICELINE_TABLE };
