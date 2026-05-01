const { Model, DataTypes, Sequelize } = require('sequelize');

const VERIFACTU_LOG_TABLE = 'verifactu_logs';

const verifactuLogSchema = {
  id: {
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER
  },
  // Referencia a la factura registrada
  invoiceCode: {
    field: 'invoice_code',
    allowNull: false,
    type: DataTypes.STRING,
    unique: true, // Un registro Veri*factu por factura
  },
  // Huella encadenada
  fingerprint: {
    field: 'fingerprint',
    allowNull: false,
    type: DataTypes.TEXT, // El hash (SHA-256) del registro actual
  },
  prevFingerprint: {
    field: 'prev_fingerprint',
    allowNull: true, // El primero de la historia será null
    type: DataTypes.TEXT,
  },
  // URL o cadena de texto que genera el código QR
  qrData: {
    field: 'qr_data',
    allowNull: true,
    type: DataTypes.TEXT, // Almacena la URL completa de la AEAT
  },
  // Contenido enviado/generado (XML o JSON formateado)
  payload: {
    field: 'payload',
    allowNull: false,
    type: DataTypes.JSONB, // Guardamos el objeto exacto enviado a la AEAT
  },
  // Respuesta de la AEAT
  externalReference: {
    field: 'external_reference',
    allowNull: true,
    type: DataTypes.STRING, // CSV o ID de recepción de la AEAT
  },
  isTest: {
    field: 'is_test',
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdAt: {
    field: 'created_at',
    allowNull: false,
    type: DataTypes.DATE,
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  }
};

class VerifactuLog extends Model {
  static associate(models) {
    this.belongsTo(models.salesPostInvoice, {
      as: 'invoice',
      foreignKey: 'invoiceCode'
    });
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: VERIFACTU_LOG_TABLE,
      modelName: 'VerifactuLog',
      timestamps: false,
      underscored: true
    };
  }
}

module.exports = { VerifactuLog, verifactuLogSchema, VERIFACTU_LOG_TABLE };
