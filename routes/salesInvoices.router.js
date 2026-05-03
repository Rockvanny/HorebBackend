const express = require('express');
const passport = require('passport');
const SalesInvoiceService = require('../services/salesInvoices.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
    createSalesInvoiceSchema,
    getSalesInvoiceSchema,
    updateSalesInvoiceSchema
} = require('../schemas/salesInvoices.schema');

const router = express.Router();
const service = new SalesInvoiceService();

// Listado paginado con soporte para términos de búsqueda
router.get('/salesInvoices-paginated',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
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

/**
 * Busca facturas (o presupuestos según el servicio) por código de cliente.
 * Útil para selectores de documentos origen.
 */
router.get('/by-customer/:entityCode',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    async (req, res, next) => {
        try {
            const { entityCode } = req.params;
            const result = await service.findByCustomer(entityCode);
            res.json({ success: true, data: result });
        } catch (error) { next(error); }
    }
);

// Obtener una factura por código o ID
router.get('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const includeLines = req.query.include_lines === 'true';

            // Ahora findOne maneja la lógica de impuestos internamente
            const record = await service.findOne(code, { includeLines });

            res.json({ success: true, data: record });
        } catch (error) { next(error); }
    }
);

// Crear nueva factura (Borrador)
router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(createSalesInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            // Extraemos el ID de usuario del token de forma segura
            const userId = req.user.userId || req.user.sub || 'system';
            const newInvoice = await service.create(req.body, userId);
            res.status(201).json(newInvoice);
        } catch (error) { next(error); }
    }
);

// Archivar factura (Pasar a factura definitiva/contabilizada)
router.post('/:code/archive',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const userId = req.user.userId || req.user.sub || 'system';
            const result = await service.archiveInvoice(code, userId);
            res.status(200).json({ success: true, data: result });
        } catch (error) { next(error); }
    }
);

// Actualizar factura borrador
router.put('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    validatorHandler(updateSalesInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            // El servicio se encarga de recalcular totales e impuestos si vienen líneas
            const record = await service.update(code, req.body);
            res.json(record);
        } catch (error) { next(error); }
    }
);

module.exports = router;
