const express = require('express');
const passport = require('passport');
const SalesInvoiceLineService = require('../services/salesInvoiceLines.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkAction } = require('../middlewares/auth.handler');
const {
    createSalesInvoiceLineSchema,
    getSalesInvoiceLineSchema,
    updateSalesInvoiceLineSchema,
    querySalesInvoiceLineSchema
} = require('../schemas/salesInvoiceLine.schema');

const router = express.Router();
const service = new SalesInvoiceLineService();

// Obtener por ID
router.get('/:id',
    passport.authenticate('jwt', { session: false }),
   // checkAction('VIEW_SALESINVOICES'),
    validatorHandler(getSalesInvoiceLineSchema, 'params'),
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
    //checkAction('CREATE_SALESINVOICES'),
    validatorHandler(createSalesInvoiceLineSchema, 'body'),
    async (req, res, next) => {
        try {
            const userId = req.user.userId || req.user.sub;
            const newLine = await service.create(req.body, userId);
            res.status(201).json(newLine);
        } catch (error) { next(error); }
    }
);

// Actualizar por ID
router.patch('/:id',
    passport.authenticate('jwt', { session: false }),
    //checkAction('UPDATE_SALESINVOICES'),
    validatorHandler(getSalesInvoiceLineSchema, 'params'),
    validatorHandler(updateSalesInvoiceLineSchema, 'body'),
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
   // checkAction('DELETE_SALESINVOICES'),
    validatorHandler(getSalesInvoiceLineSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await service.delete(id);
            res.json(result);
        } catch (error) { next(error); }
    }
);

module.exports = router;
