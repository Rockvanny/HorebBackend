const { Model, DataTypes } = require('sequelize');

const VERIFACTU_CONFIG_TABLE = 'verifactu_config';

// Cómo se genera/envía cada registro Veri*factu. Conceptualmente es un
// singleton (una sola fila real, como company), pero se modela como CRUD
// normal (id autoincremental) para reutilizar el flujo estándar de
// lista+ficha del frontend (ver document-schema.mjs#verifactuConfig), igual
// que company.model.js.
//
// useProvider = false -> modo local: se genera el XML exportable para
//               subirlo a mano (ver routes/verifactu.router.js).
// useProvider = true  -> se envía a un proveedor externo usando los campos
//               de conexión de abajo (envío aún no implementado, solo el
//               almacenamiento de la config).
const VerifactuConfigSchema = {
  id: {
    field: 'id',
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
    type: DataTypes.INTEGER
  },

  useProvider: {
    field: 'use_provider',
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },

  providerName: {
    field: 'provider_name',
    type: DataTypes.STRING,
    allowNull: true,
  },

  apiBaseUrl: {
    field: 'api_base_url',
    type: DataTypes.STRING,
    allowNull: true,
  },

  apiKey: {
    field: 'api_key',
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Cifrado en reposo con libs/crypto.js (AES-256-GCM). Nunca se expone en
  // claro por la API: ver services/verifactuConfig.service.js.
  apiSecret: {
    field: 'api_secret',
    type: DataTypes.TEXT,
    allowNull: true,
  },

  username: {
    field: 'user_name',
    type: DataTypes.STRING,
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

class VerifactuConfig extends Model {
  static associate(models) { }

  static config(sequelize) {
    return {
      sequelize,
      tableName: VERIFACTU_CONFIG_TABLE,
      modelName: 'VerifactuConfig',
      timestamps: true,
      underscored: true
    };
  }
}

module.exports = { VerifactuConfig, VerifactuConfigSchema, VERIFACTU_CONFIG_TABLE };
