const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { SERIES_TYPES } = require('../db/models/SeriesNumber.model');

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
    'salesPostInvoice': 'salesinvoice', // Mapeamos el histórico al tipo de factura de venta
    'purchInvoice': 'purchinvoice',
    'purchPostInvoice': 'purchinvoice', // Mapeamos el histórico al tipo de factura de compra
};

async function generateNextCode(instance, options) {
    try {
        const modelName = instance.constructor.options?.name?.singular || instance.constructor.name;

        // 1. Buscamos el tipo de serie (traducción)
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

        // 2. PRIORIDAD DE BÚSQUEDA DE SERIE:
        // Primero intentamos usar 'seriesCode' (el nuevo campo que creamos)
        // Si no existe, probamos con 'selectedSerie' (compatibilidad)
        const targetSerieCode = instance.seriesCode || instance.selectedSerie;

        if (targetSerieCode) {
            findOptions.where.code = targetSerieCode;
        }

        const serie = await seriesNumber.findOne(findOptions);

        if (!serie) {
            const extraInfo = targetSerieCode ? ` con código '${targetSerieCode}'` : '';
            throw boom.badRequest(`No existe serie activa para '${typeStr}'${extraInfo} hoy.`);
        }

        // 3. Generación del nuevo código
        const nextValue = incrementAlphanumeric(serie.lastValue || serie.code);

        instance.code = nextValue;

        // 4. Actualización del contador de la serie
        await serie.update({ lastValue: nextValue }, {
            transaction: options.transaction || null
        });

    } catch (error) {
        console.error(`[Sequence Error] ${instance.constructor.name}:`, error.message);
        throw error;
    }
}

module.exports = { generateNextCode, incrementAlphanumeric };
