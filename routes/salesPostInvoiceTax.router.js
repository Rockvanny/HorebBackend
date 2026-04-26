const express = require('express');
const passport = require('passport');
const salesPostInvoiceTaxService = require('../services/salesPostInvoiceTax.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const { filterInvoiceTaxSchema } = require('../schemas/salesInvoiceTax.schema'); // Reutilizamos el validador ya que la estructura es igual

const router = express.Router();
const service = new salesPostInvoiceTaxService();

/**
 * Consulta el desglose de IVA de una factura ya emitida/registrada
 * GET /api/v1/sales-post-invoice-taxes/by-invoice/FAC-2026-0001
 */
router.get('/by-invoice/:invoiceCode',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(filterInvoiceTaxSchema, 'params'),
    async (req, res, next) => {
        try {
            const { invoiceCode } = req.params;
            const record = await service.findByPostInvoice(invoiceCode);
            res.json({ success: true, data: record });
        } catch (error) { next(error); }
    }
);

module.exports = router;
