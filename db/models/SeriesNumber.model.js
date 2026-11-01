const { Model, DataTypes, Sequelize } = require('sequelize');

const SERIESNUMBER_TABLE = 'series_numbers';

// Diccionario centralizado de tipos (Lógica interna y visual)
const SERIES_TYPES = {
  customer:     { id: 1, label: 'Cliente' },
  vendor:       { id: 2, label: 'Proveedor' },
  product:      { id: 3, label: 'Producto' },
  budget:       { id: 4, label: 'Presupuesto' },
  salesinvoice: { id: 5, label: 'Documento de venta' },
  purchinvoice: { id: 6, label: 'Documento de compra' }
};

const seriesNumberSchema = {
  type: {
    field: 'type',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.INTEGER // Identificador numérico (1, 2, 3...)
  },
  code: {
    field: 'code',
    allowNull: false,
    primaryKey: true,
    type: DataTypes.STRING // Ej: 'FV2026-B'
  },
  lastValue: {
    field: 'last_value',
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '' // Ej: 'FV000'
  },
  postingSerie: {
    field: 'posting_serie',
    type: DataTypes.STRING,
    allowNull: true, // Código de la serie de registro vinculada
  },
  description: {
    field: 'description',
    type: DataTypes.STRING,
    allowNull: false,
  },
  fromDate: {
    field: 'from_date',
    allowNull: false,
    type: DataTypes.DATEONLY
  },
  toDate: {
    field: 'to_date',
    allowNull: false,
    type: DataTypes.DATEONLY
  },
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
};

class seriesNumber extends Model {
  static associate(models) {
    // Definir asociaciones aquí si fueran necesarias
  }

  // Getter para uso directo en la instancia (serie.typeLabel)
  get typeLabel() {
    const typeData = Object.values(SERIES_TYPES).find(t => t.id === this.type);
    return typeData ? typeData.label : 'Desconocido';
  }

  static config(sequelize) {
    return {
      sequelize,
      tableName: SERIESNUMBER_TABLE,
      modelName: 'seriesNumber',
      timestamps: true,
      underscored: true,
      // Los getterMethods aseguran que la propiedad aparezca al hacer JSON.stringify()
      getterMethods: {
        typeLabel() {
          const typeData = Object.values(SERIES_TYPES).find(t => t.id === this.type);
          return typeData ? typeData.label : 'Desconocido';
        },
        // Columna "Vigencia" del listado de series. Las series de clientes,
        // proveedores y productos se crean sin caducidad (hasta 9999-12-31,
        // ver fields-series-handlel.js): se muestran como "Sin caducidad"
        // en vez de con una fecha absurda.
        validity() {
          const from = this.getDataValue('fromDate');
          const to = this.getDataValue('toDate');
          if (!from || !to) return '';
          if (String(to) >= '9999-01-01') return 'Sin caducidad';
          const fmt = (d) => String(d).slice(0, 10).split('-').reverse().join('/');
          return `${fmt(from)} – ${fmt(to)}`;
        }
      }
    };
  }
}

// Exportamos también SERIES_TYPES para que el Servicio pueda usarlo para traducir
module.exports = { seriesNumber, seriesNumberSchema, SERIESNUMBER_TABLE, SERIES_TYPES };
