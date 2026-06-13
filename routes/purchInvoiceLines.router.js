// routes/purchInvoiceLines.router.js
const express = require('express');
const passport = require('passport');
const PurchInvoiceLineService = require('../services/purchInvoiceLine.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
    createPurchInvoiceLineSchema,
    getPurchInvoiceLineSchema,
    updatePurchInvoiceLineSchema,
    queryPurchInvoiceLineSchema
} = require('../schemas/purchInvoiceLine.schema');

const router = express.Router();
const service = new PurchInvoiceLineService();

// Obtener por ID
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

// Crear línea
router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(createPurchInvoiceLineSchema, 'body'),
    async (req, res, next) => {
        try {
            const userId = req.user.userId || req.user.sub;
            const newLine = await service.create(req.body, userId);
            res.status(201).json(newLine);
        } catch (error) { next(error); }
    }
);

// Actualizar por ID (Cambiado a PATCH para calcar ventas)
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

// Eliminar por ID
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
