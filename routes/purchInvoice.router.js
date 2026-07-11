// routes/purchInvoices.router.js
const express = require('express');
const passport = require('passport');
const PurchInvoiceService = require('../services/purchInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkAction } = require('../middlewares/auth.handler');
const {
    createPurchInvoiceSchema,
    getPurchInvoiceSchema,
    updatePurchInvoiceSchema
} = require('../schemas/purchInvoice.schema');

const router = express.Router();
const service = new PurchInvoiceService();

// Listado paginado con soporte para términos de búsqueda
router.get('/purchInvoices-paginated',
    passport.authenticate('jwt', { session: false }),
    //checkAction('VIEW_PURCHINVOICES'),
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
 * Busca facturas de compra por código de proveedor.
 * Útil para selectores de documentos origen (Equivalente simétrico a by-customer).
 */
router.get('/by-vendor/:entityCode',
    passport.authenticate('jwt', { session: false }),
    //checkAction('VIEW_PURCHINVOICES'),
    async (req, res, next) => {
        try {
            const { entityCode } = req.params;
            const result = await service.findByVendor(entityCode);
            res.json({ success: true, data: result });
        } catch (error) { next(error); }
    }
);

// Obtener una factura de compra por código o ID
router.get('/:code',
    passport.authenticate('jwt', { session: false }),
    //checkAction('VIEW_PURCHINVOICES'),
    validatorHandler(getPurchInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const includeLines = req.query.include_lines === 'true';

            // El servicio maneja la lógica interna de la consulta y relaciones
            const record = await service.findOne(code, { includeLines });

            res.json({ success: true, data: record });
        } catch (error) { next(error); }
    }
);

// Crear nueva factura de compra (Borrador)
router.post('/',
    passport.authenticate('jwt', { session: false }),
   // checkAction('CREATE_PURCHINVOICES'),
    validatorHandler(createPurchInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            // Extraemos el ID de usuario del token de forma segura
            const userId = req.user.userId || req.user.sub || 'system';
            const newInvoice = await service.create(req.body, userId);
            res.status(201).json(newInvoice);
        } catch (error) { next(error); }
    }
);

// Archivar/Registrar factura (Pasar a factura de compra definitiva/contabilizada)
router.post('/:code/archive',
    passport.authenticate('jwt', { session: false }),
    //checkAction('UPDATE_PURCHINVOICES'),
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

// Actualizar factura borrador de compra
router.patch('/:code',
    passport.authenticate('jwt', { session: false }),
    //checkAction('UPDATE_PURCHINVOICES'),
    validatorHandler(getPurchInvoiceSchema, 'params'),
    validatorHandler(updatePurchInvoiceSchema, 'body'),
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
