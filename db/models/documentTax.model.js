const { Model, DataTypes } = require('sequelize');

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
    type: DataTypes.ENUM('budget', 'salesinvoice', 'salespostinvoice', 'purchinvoice', 'purchpostinvoice'),
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
      ]
    };
  }
}

module.exports = { DocumentTax, documentTaxSchema, DOCUMENT_TAX_TABLE };
