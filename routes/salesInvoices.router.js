const express = require('express');
const passport = require('passport');
const salesInvoiceService = require('../services/salesInvoices.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
    createSalesInvoiceSchema,
    getSalesInvoiceSchema,
    updateSalesInvoiceSchema
} = require('../schemas/salesInvoices.schema');

const router = express.Router();
const service = new salesInvoiceService();

router.get('/salesInvoices-paginated',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    async(req, res, next) => {
        try {
            const { limit, offset, searchTerm, overdue } = req.query;
            const result = await service.findPaginated({ limit, offset, searchTerm, filter: overdue === 'true' ? 'overdue' : null });
            res.json(result);
        } catch (error) { next(error); }
    }
);

router.get('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const includeLines = req.query.include_lines === 'true';
            const record = await service.findOne(code, { includeLines });
            res.json({ success: true, data: record });
        } catch (error) { next(error); }
    }
);

router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(createSalesInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const userId = req.user.userId || req.user.sub;
            const newInvoice = await service.create(req.body, userId);
            res.status(201).json(newInvoice);
        } catch (error) { next(error); }
    }
);

router.post('/:code/archive',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const userId = req.user.userId || req.user.sub;
            const result = await service.archiveInvoice(code, userId);
            res.status(200).json({ success: true, data: result });
        } catch (error) { next(error); }
    }
);

router.put('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    validatorHandler(updateSalesInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const record = await service.update(code, req.body);
            res.json(record);
        } catch (error) { next(error); }
    }
);

module.exports = router;
