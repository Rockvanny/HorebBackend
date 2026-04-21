const express = require('express');
const SalesPostInvoiceService = require('../services/SalesPostInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  createSalesPostInvoiceSchema,
  getSalesPostInvoiceSchema,
  querySalesPostInvoiceSchema
} = require('../schemas/salesPostInvoice.schema');

const router = express.Router();
const service = new SalesPostInvoiceService();

/**
 * GET / - Listado paginado de facturas registradas
 */
router.get('/',
  checkPermission('VIEW_SALESPOSTINVOICES'),
  validatorHandler(querySalesPostInvoiceSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /:code - Detalle de una factura específica con sus líneas
 */
router.get('/:code',
  checkPermission('VIEW_SALESPOSTINVOICES'),
  validatorHandler(getSalesPostInvoiceSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const invoice = await service.findOne(code, { includeLines: true });
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST / - Registro oficial de factura (Acción irreversible)
 * Este es el endpoint que dispara el flujo: Factura -> Líneas -> Verifactu
 */
router.post('/',
  checkPermission('CREATE_SALESPOSTINVOICES'),
  validatorHandler(createSalesPostInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      // Inyectamos el usuario de la sesión para la trazabilidad
      const data = {
        ...req.body,
        username: req.user.username
      };

      const result = await service.create(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /stats/budget/:budgetCode - Utilidad para ver el total facturado de un presupuesto
 */
router.get('/stats/budget/:budgetCode',
  checkPermission('VIEW_SALESPOSTINVOICES'),
  async (req, res, next) => {
    try {
      const { budgetCode } = req.params;
      const total = await service.getTotalByBudget(budgetCode);
      res.json({ budgetCode, total });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
