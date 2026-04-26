const express = require('express');
const passport = require('passport');
const salesInvoiceTaxService = require('../services/salesInvoiceTax.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const { filterInvoiceTaxSchema } = require('../schemas/salesInvoiceTax.schema');

const router = express.Router();
const service = new salesInvoiceTaxService();

/**
 * Obtener el desglose de impuestos de una factura mediante su código
 * GET /api/v1/sales-invoice-taxes/by-invoice/FAC-001
 */
router.get('/by-invoice/:invoiceCode',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(filterInvoiceTaxSchema, 'params'),
    async (req, res, next) => {
        try {
            const { invoiceCode } = req.params;
            const record = await service.findByInvoice(invoiceCode);
            res.json({ success: true, data: record });
        } catch (error) { next(error); }
    }
);

module.exports = router;
