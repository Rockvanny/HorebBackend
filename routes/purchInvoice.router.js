const express = require('express');
const passport = require('passport');
const PurchInvoiceService = require('../services/purchInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
    createPurchInvoiceSchema,
    getPurchInvoiceSchema,
    updatePurchInvoiceSchema,
    queryPurchInvoiceSchema
} = require('../schemas/purchInvoice.schema');

const router = express.Router();
const service = new PurchInvoiceService();

/**
 * CONSULTAS (VIEW)
 */

// Listado paginado con soporte para términos de búsqueda y filtros
router.get('/purchInvoices-paginated',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    async(req, res, next) => {
        try {
            const { limit, offset, searchTerm, overdue } = req.query;
            const result = await service.findPaginated({
                limit,
                offset,
                searchTerm,
                filter: overdue === 'true' ? 'overdue' : null
            });
            res.json(result);
        } catch (error) { next(error); }
    }
);

// Contador para estadísticas rápidos (Dashboard/Sidebar)
router.get('/count',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    async (req, res, next) => {
        try {
            const { filter, overdue } = req.query;
            const activeFilter = overdue === 'true' ? 'overdue' : filter;
            const total = await service.countAll({ filter: activeFilter });
            res.status(200).json({ total });
        } catch (error) { next(error); }
    }
);

// Obtener una factura específica por código o ID
router.get('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(getPurchInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const includeLines = req.query.include_lines === 'true' || req.query.includeLines === 'true';

            const record = await service.findOne(code, { includeLines });
            res.json({ success: true, data: record });
        } catch (error) { next(error); }
    }
);

/**
 * ACCIONES DE ESCRITURA
 */

// Crear nueva factura de compra
router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(createPurchInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            // Extracción segura del userId para el campo userName del modelo
            const userId = req.user.userId || req.user.sub || 'system';
            const newInvoice = await service.create(req.body, userId);
            res.status(201).json(newInvoice);
        } catch (error) {
            if (error.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({
                    success: false,
                    message: `El código '${req.body.code}' ya existe.`,
                    error: error.errors
                });
            }
            next(error);
        }
    }
);

// Archivar/Registrar factura de compra (Paso a histórico/contabilidad)
router.post('/:code/archive',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(getPurchInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const userId = req.user.userId || req.user.sub || 'system';
            const result = await service.archiveInvoice(code, userId);
            res.status(200).json({ success: true, data: result });
        } catch (error) { next(error); }
    }
);

// Actualizar factura de compra (Recalcula totales e impuestos automáticamente)
router.put('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(getPurchInvoiceSchema, 'params'),
    validatorHandler(updatePurchInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const record = await service.update(code, req.body);
            res.json(record);
        } catch (error) { next(error); }
    }
);

// Eliminación (Normalmente restringido a gestión/admin)
router.delete('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowGestion'),
    validatorHandler(getPurchInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            await service.delete(code);
            res.status(200).json({ code, message: 'Eliminado correctamente' });
        } catch (error) { next(error); }
    }
);

module.exports = router;
