const { Model, DataTypes, Sequelize } = require('sequelize');

const SERIESNUMBER_TABLE = 'series_numbers';

// Diccionario centralizado de tipos (Lógica interna y visual)
const SERIES_TYPES = {
  customer:     { id: 1, label: 'Cliente' },
  vendor:       { id: 2, label: 'Proveedor' },
  product:      { id: 3, label: 'Producto' },
  budget:       { id: 4, label: 'Presupuesto' },
  salesinvoice: { id: 5, label: 'Documento de venta' },
  purchinvoice: { id: 6, label: 'Documento de compra' },
  // Nº de empleado (employee.model.js#employeeNo), sin caducidad como las
  // de clientes/proveedores/productos.
  employee:     { id: 7, label: 'Empleado' }
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
  // Resolución de numeración DIAN (Colombia, migración
  // 20261115120000-add_series_dian_resolution.js). Con rango, la serie
  // numera prefijo + número consecutivo dentro de él (ver
  // libs/sequence.handler.js); sin rango es una serie normal. Su vigencia
  // son fromDate/toDate.
  coDianResolution: { field: 'co_dian_resolution', allowNull: true, type: DataTypes.STRING(30) },
  coDianResolutionDate: { field: 'co_dian_resolution_date', allowNull: true, type: DataTypes.DATEONLY },
  coDianPrefix: { field: 'co_dian_prefix', allowNull: true, type: DataTypes.STRING(4) },
  coDianRangeFrom: { field: 'co_dian_range_from', allowNull: true, type: DataTypes.BIGINT },
  coDianRangeTo: { field: 'co_dian_range_to', allowNull: true, type: DataTypes.BIGINT },
  coDianTechnicalKey: { field: 'co_dian_technical_key', allowNull: true, type: DataTypes.STRING(100) },
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

// Avisar cuando queden menos de estos números o días
const DIAN_WARN_NUMBERS = 100;
const DIAN_WARN_DAYS = 30;

/** Último número consecutivo dado por una serie DIAN (null si aún ninguno) */
const dianLastNumber = (lastValue) => {
  const match = String(lastValue || '').match(/(\d+)$/);
  return match ? Number(match[1]) : null;
};

const dianResolutionStatus = (serie) => {
  const from = serie.getDataValue('coDianRangeFrom');
  const to = serie.getDataValue('coDianRangeTo');
  if (to === null || to === undefined) return null;
  const last = dianLastNumber(serie.getDataValue('lastValue'));
  const next = last === null ? Number(from) : last + 1;
  const remaining = Math.max(0, Number(to) - next + 1);
  const toDate = serie.getDataValue('toDate');
  const today = new Date().toISOString().slice(0, 10);
  const daysLeft = toDate ? Math.round((Date.parse(toDate) - Date.parse(today)) / 86400000) : null;
  const warnings = [];
  if (remaining === 0) warnings.push('Rango de numeración agotado: solicita una nueva resolución a la DIAN.');
  else if (remaining <= DIAN_WARN_NUMBERS) warnings.push(`Quedan ${remaining} números de la resolución.`);
  if (daysLeft !== null && daysLeft < 0) warnings.push('La resolución está vencida.');
  else if (daysLeft !== null && daysLeft <= DIAN_WARN_DAYS) warnings.push(`La resolución vence en ${daysLeft} días.`);
  return { next, remaining, daysLeft, warnings };
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
        },
        // Estado de la resolución DIAN (null si la serie no tiene): números
        // que quedan y días hasta que vence, para avisar antes de quedarse
        // sin poder facturar (ver dianResolutionStatus)
        coDianStatus() {
          return dianResolutionStatus(this);
        }
      }
    };
  }
}

// Exportamos también SERIES_TYPES para que el Servicio pueda usarlo para traducir
module.exports = { seriesNumber, seriesNumberSchema, SERIESNUMBER_TABLE, SERIES_TYPES, dianLastNumber };
