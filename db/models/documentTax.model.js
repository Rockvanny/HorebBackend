const { Model, DataTypes, Op } = require('sequelize');
const { taxClassOf } = require('../../libs/taxClasses');

const DOCUMENT_TAX_TABLE = 'document_taxes';

const documentTaxSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  // Mantenemos el contexto para saber de qué carpeta/entidad viene
  codeDocument: {
    field: 'code_document',
    type: DataTypes.ENUM('budget', 'salesinvoice', 'salespostinvoices', 'purchinvoice', 'purchpostinvoices'),
    allowNull: false
  },
  // NUEVO: La clave de unión universal (UUID)
  // Sustituye al parentId numérico para permitir el "traspaso" entre tablas
  movementId: {
    field: 'movement_id',
    allowNull: false,
    type: DataTypes.UUID // Cambiado a UUID para usar la librería 'uuid'
  },
  taxType: {
    field: 'tax_type',
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'IVA'
  },
  // Copia de la clase fiscal y la causa de exención del tipo en el catálogo
  // (tax_rates) al calcular: Veri*factu las lee de aquí, así que cambiar
  // el catálogo después no altera lo ya calculado. Ver fillTaxClasses.
  taxClass: {
    field: 'tax_class',
    type: DataTypes.STRING(12),
    allowNull: true
  },
  exemptionCause: {
    field: 'exemption_cause',
    type: DataTypes.STRING(2),
    allowNull: true
  },
  taxPercentage: {
    field: 'tax_percentage',
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  taxableAmount: {
    field: 'taxable_amount',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  taxAmount: {
    field: 'tax_amount',
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0.0000
  },
  // Añadimos explícitamente los timestamps para controlarlos mejor
  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    field: 'updated_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
};

class DocumentTax extends Model {
  /**
   * Completa taxClass / exemptionCause de las filas que no los traen
   * (libs/taxCalculation.js solo pone la clase de las retenciones) con el
   * tipo del catálogo del mismo código y porcentaje; si no está en el
   * catálogo, por su código (libs/taxClasses.js).
   */
  static async fillTaxClasses(rows, transaction) {
    const pending = rows.filter(r => !r.taxClass);
    if (!pending.length) return;
    const { TaxRate } = this.sequelize.models;
    const catalog = await TaxRate.findAll({
      where: { code: { [Op.in]: [...new Set(pending.map(r => r.taxType))] } },
      attributes: ['code', 'percentage', 'taxClass', 'exemptionCause'],
      transaction
    });
    const key = (code, pct) => `${code}|${Number(pct || 0).toFixed(2)}`;
    const byKey = new Map(catalog.map(t => [key(t.code, t.percentage), t]));
    const byCode = new Map(catalog.map(t => [t.code, t]));
    for (const row of pending) {
      const rate = byKey.get(key(row.taxType, row.taxPercentage)) || byCode.get(row.taxType);
      row.taxClass = rate?.taxClass || taxClassOf(row.taxType);
      if (row.taxClass === 'EXENTO' && !row.exemptionCause) row.exemptionCause = rate?.exemptionCause || 'E1';
    }
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: DOCUMENT_TAX_TABLE,
      modelName: 'DocumentTax',
      timestamps: true,
      underscored: true,
      // ÍNDICE CRÍTICO: Ahora buscamos por movement_id
      indexes: [
        {
          unique: false,
          fields: ['code_document', 'movement_id']
        }
      ],
      hooks: {
        beforeBulkCreate: (rows, options) => DocumentTax.fillTaxClasses(rows, options.transaction),
        beforeCreate: (row, options) => DocumentTax.fillTaxClasses([row], options.transaction)
      }
    };
  }
}

module.exports = { DocumentTax, documentTaxSchema, DOCUMENT_TAX_TABLE };
