const { Model, DataTypes } = require('sequelize');
const { TAX_CLASSES, EXEMPTION_CAUSES } = require('../../libs/taxClasses');

const TAX_RATE_TABLE = 'tax_rates';

/**
 * Catálogo de tipos impositivos (Configuración › Impuestos, ver migración
 * 20261114200000-create_tax_rates.js). Cada fila es un impuesto con su
 * porcentaje: "IVA general 21 %", "Retención profesionales 15 %"... Las
 * líneas y productos guardan COPIA del código y el porcentaje (no una
 * referencia): editar o desactivar un tipo no cambia documentos hechos.
 * La clase fiscal decide el cálculo y Veri*factu (ver libs/taxClasses.js).
 */
const TaxRateSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  // Lo que se guarda en la línea y sale en la factura (IVA, IRPF, IGIC...)
  code: {
    allowNull: false,
    type: DataTypes.STRING(20)
  },
  name: {
    allowNull: false,
    type: DataTypes.STRING(80)
  },
  taxClass: {
    field: 'tax_class',
    allowNull: false,
    type: DataTypes.STRING(12),
    validate: { isIn: [TAX_CLASSES] }
  },
  percentage: {
    allowNull: false,
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  // Solo EXENTO: causa que se declara en Veri*factu (E1-E6)
  exemptionCause: {
    field: 'exemption_cause',
    allowNull: true,
    type: DataTypes.STRING(2),
    validate: { isIn: [EXEMPTION_CAUSES] }
  },
  // El que se propone en líneas y productos nuevos (uno solo, no retención)
  isDefault: {
    field: 'is_default',
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  active: {
    allowNull: false,
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sortOrder: {
    field: 'sort_order',
    allowNull: false,
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  }
};

/**
 * Columnas de impuesto de líneas y productos (antes un ENUM fijo repetido
 * en cada modelo): el código del impuesto (su porcentaje va en `vat`) y la
 * retención opcional. Copias del catálogo, sin clave foránea.
 */
const lineTaxAttributes = () => ({
  taxType: {
    field: 'tax_type',
    allowNull: false,
    type: DataTypes.STRING(20),
    defaultValue: 'IVA'
  },
  withholdingType: {
    field: 'withholding_type',
    allowNull: true,
    type: DataTypes.STRING(20)
  },
  withholdingPercentage: {
    field: 'withholding_percentage',
    allowNull: true,
    type: DataTypes.DECIMAL(5, 2)
  }
});

class TaxRate extends Model {
  static associate() { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: TAX_RATE_TABLE,
      modelName: 'TaxRate',
      timestamps: true,
      underscored: true
    };
  }
}

module.exports = { TaxRate, TaxRateSchema, TAX_RATE_TABLE, lineTaxAttributes };
