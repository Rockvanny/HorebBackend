const { Op } = require('sequelize');
const boom = require('@hapi/boom');

// Importamos SERIES_TYPES para traducir nombres de modelos a IDs numéricos de la DB
const { SERIES_TYPES } = require('../db/models/SeriesNumber.model');

/**
 * Lógica de incremento alfanumérico pura
 */
function _incrementText(value) {
  const match = value.match(/(\d+)$/);
  if (!match) return value;

  const numberStr = match[0];
  const prefix = value.substring(0, value.length - numberStr.length);
  const nextNumber = parseInt(numberStr, 10) + 1;
  const nextNumberStr = nextNumber.toString().padStart(numberStr.length, '0');

  return prefix + nextNumberStr;
}

const MODEL_SERIES_MAP = {
  'Customer': 'customer',
  'Product': 'product',
  'Vendor': 'vendor',
  'salesBudget': 'budget',
  'salesInvoice': 'salesinvoice',
  'purchInvoice': 'purchinvoice',
};

async function generateNextCode(instance, options) {
  try {
    // 1. OBTENCIÓN DEL NOMBRE DEL MODELO
    const modelName = instance.constructor.options?.name?.singular ||
                      instance.constructor.name;

    // 2. TRADUCCIÓN A TIPO STRING Y LUEGO A ID NUMÉRICO
    const typeStr = MODEL_SERIES_MAP[modelName] || modelName.toLowerCase();
    const typeInfo = SERIES_TYPES[typeStr];

    if (!typeInfo) {
      throw new Error(`El tipo '${typeStr}' no está definido en SERIES_TYPES.`);
    }

    const typeId = typeInfo.id; // El 1, 2, 5... que espera la DB

    // 3. ACCESO AL MODELO DE SERIES
    const { seriesNumber } = instance.sequelize.models;
    const today = new Date().toISOString().split('T')[0];

    // 4. CONFIGURACIÓN DE BÚSQUEDA
    const findOptions = {
      where: {
        type: typeId,
        fromDate: { [Op.lte]: today },
        toDate: { [Op.gte]: today }
      }
    };

    if (options.transaction) {
      findOptions.transaction = options.transaction;
      findOptions.lock = options.transaction.LOCK.UPDATE;
    }

    // Si el front envió una serie específica (por el campo VIRTUAL)
    if (instance.selectedSerie) {
      findOptions.where.code = instance.selectedSerie;
    }

    // 5. BÚSQUEDA
    const serie = await seriesNumber.findOne(findOptions);

    if (!serie) {
      throw boom.badRequest(
        `No existe serie activa para '${typeStr}' (${modelName}) en la fecha ${today}.`
      );
    }

    // 6. CÁLCULO ALFANUMÉRICO (La nueva lógica)
    // Usamos 'lastValue' en lugar de 'lastNumber'
    const nextValue = _incrementText(serie.lastValue);

    // Asignamos el código final a la instancia (Cliente, Factura, etc.)
    instance.code = nextValue;

    // 7. ACTUALIZACIÓN DE LA SERIE
    await serie.update({ lastValue: nextValue }, {
      transaction: options.transaction || null
    });

    console.log(`[Sequence] Generado: ${instance.code} para ${modelName}`);

  } catch (error) {
    console.error(`[Sequence Error] ${instance.constructor.name}:`, error.message);
    throw error;
  }
}

module.exports = { generateNextCode };
