const express = require('express');
const passport = require('passport'); // 1. Importar Passport
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
  passport.authenticate('jwt', { session: false }), // 2. Autenticación obligatoria
  checkPermission('allowSales'), // 3. Permiso unificado (Ventas)
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
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
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
 * Inyectamos Passport para asegurar que req.user esté disponible
 */
router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(createSalesPostInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      // Ahora req.user existe con total seguridad
      const data = {
        ...req.body,
        username: req.user.username,
        userId: req.user.userId || req.user.sub // Trazabilidad completa
      };

      const result = await service.create(data);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /stats/budget/:budgetCode - Total facturado de un presupuesto
 */
router.get('/stats/budget/:budgetCode',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
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
