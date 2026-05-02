const express = require('express');
const passport = require('passport');
const PurchInvoiceLineService = require('../services/purchInvoiceLine.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
    createPurchInvoiceLineSchema,
    getPurchInvoiceLineSchema, // Ahora este debe validar el ID numérico
    updatePurchInvoiceLineSchema,
    queryPurchInvoiceLineSchema
} = require('../schemas/purchInvoiceLine.schema');

const router = express.Router();
const service = new PurchInvoiceLineService();

/**
 * CONSULTAS (VIEW)
 */

// Listado paginado de líneas
router.get('/paginated',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(queryPurchInvoiceLineSchema, 'query'),
    async (req, res, next) => {
        try {
            const result = await service.findPaginated(req.query);
            res.json(result);
        } catch (error) { next(error); }
    }
);

// Obtener línea por ID (Sincronizado con Ventas)
router.get('/:id',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(getPurchInvoiceLineSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const line = await service.findOne(id);
            res.json(line);
        } catch (error) { next(error); }
    }
);

/**
 * ACCIONES DE ESCRITURA (Sincronizado con Ventas)
 */

// Crear línea
router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(createPurchInvoiceLineSchema, 'body'),
    async (req, res, next) => {
        try {
            // Extracción segura del ID de usuario para auditoría
            const userId = req.user.userId || req.user.sub || 'system';
            const newLine = await service.create(req.body, userId);
            res.status(201).json(newLine);
        } catch (error) { next(error); }
    }
);

// Actualizar línea por ID
router.patch('/:id',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(getPurchInvoiceLineSchema, 'params'),
    validatorHandler(updatePurchInvoiceLineSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const line = await service.update(id, req.body);
            res.json(line);
        } catch (error) { next(error); }
    }
);

// Eliminar línea por ID
router.delete('/:id',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(getPurchInvoiceLineSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await service.delete(id);
            res.json(result);
        } catch (error) { next(error); }
    }
);

module.exports = router;
