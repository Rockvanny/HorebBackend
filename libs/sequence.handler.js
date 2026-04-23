const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { SERIES_TYPES } = require('../db/models/SeriesNumber.model');

/**
 * Lógica de incremento alfanumérico pura.
 * Se exporta para que el Service también pueda usarla.
 */
function incrementAlphanumeric(value) {
    if (!value) return "";
    const match = value.match(/(\d+)$/);

    if (!match) return value + "001";

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
        const modelName = instance.constructor.options?.name?.singular || instance.constructor.name;
        const typeStr = MODEL_SERIES_MAP[modelName] || modelName.toLowerCase();
        const typeInfo = SERIES_TYPES[typeStr];

        if (!typeInfo) throw new Error(`El tipo '${typeStr}' no está definido.`);

        const { seriesNumber } = instance.sequelize.models;
        const today = new Date().toISOString().split('T')[0];

        const findOptions = {
            where: {
                type: typeInfo.id,
                fromDate: { [Op.lte]: today },
                toDate: { [Op.gte]: today }
            }
        };

        if (options.transaction) {
            findOptions.transaction = options.transaction;
            findOptions.lock = options.transaction.LOCK.UPDATE;
        }

        if (instance.selectedSerie) findOptions.where.code = instance.selectedSerie;

        const serie = await seriesNumber.findOne(findOptions);
        if (!serie) {
            throw boom.badRequest(`No existe serie activa para '${typeStr}' (${modelName}) hoy.`);
        }

        // Usamos la función interna de incremento
        const nextValue = incrementAlphanumeric(serie.lastValue || serie.code);

        instance.code = nextValue;

        await serie.update({ lastValue: nextValue }, {
            transaction: options.transaction || null
        });

    } catch (error) {
        console.error(`[Sequence Error] ${instance.constructor.name}:`, error.message);
        throw error;
    }
}

// Exportamos ambas: la lógica de incremento y el hook de Sequelize
module.exports = { generateNextCode, incrementAlphanumeric };
