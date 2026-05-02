const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { VerifactuLog, salesPostInvoice } = sequelize.models;

class VerifactuService {
    constructor() {}

    /**
     * BUSCAR POR ID
     */
    async findOne(id) {
        const log = await VerifactuLog.findByPk(id, {
            include: [{
                model: salesPostInvoice,
                as: 'invoice',
                attributes: ['code', 'amountWithVAT', 'postingDate']
            }]
        });

        if (!log) {
            throw boom.notFound('Registro de Veri*factu no encontrado');
        }
        return log;
    }

    /**
     * ACTUALIZAR REFERENCIA EXTERNA
     * @param {Number} id - ID del log
     * @param {Object} changes - Objeto con externalReference
     */
    async update(id, changes) {
        const log = await this.findOne(id);

        // Seguridad: Solo permitimos actualizar la referencia externa.
        // El resto de campos (fingerprint, payload, etc.) son inmutables.
        const updateData = {
            externalReference: changes.externalReference
        };

        const updatedLog = await log.update(updateData);
        return updatedLog;
    }

    /**
     * PAGINACIÓN PARA EXPLORER
     */
    async findPaginated(query) {
        const { limit, offset, searchTerm, isTest } = query;
        const parsedLimit = parseInt(limit, 10) || 50;
        const parsedOffset = parseInt(offset, 10) || 0;

        const options = {
            limit: parsedLimit,
            offset: parsedOffset,
            order: [['created_at', 'DESC']],
            where: {},
            include: [{
                model: salesPostInvoice,
                as: 'invoice',
                attributes: ['code', 'amountWithVAT']
            }]
        };

        if (isTest !== undefined) {
            options.where.isTest = isTest === 'true';
        }

        if (searchTerm) {
            options.where[Op.or] = [
                { invoiceCode: { [Op.iLike]: `%${searchTerm}%` } },
                { externalReference: { [Op.iLike]: `%${searchTerm}%` } }
            ];
        }

        const { count, rows } = await VerifactuLog.findAndCountAll(options);

        return {
            records: rows,
            total: count,
            hasMore: (parsedOffset + rows.length) < count
        };
    }
}

module.exports = VerifactuService;
