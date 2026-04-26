const express = require('express');
const passport = require('passport');
const SalesPostInvoiceService = require('../services/salesPostInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  createSalesPostInvoiceSchema,
  getSalesPostInvoiceSchema,
  querySalesPostInvoiceSchema
} = require('../schemas/salesPostInvoice.schema');

const router = express.Router();
const service = new SalesPostInvoiceService();

// Listado de histórico (facturas registradas)
router.get('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(querySalesPostInvoiceSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

// Obtener una factura específica por su CÓDIGO (Ej: FAC-2026-0001)
router.get('/:code',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  // Validamos que el parámetro 'code' cumpla con el esquema getSalesPostInvoiceSchema
  validatorHandler(getSalesPostInvoiceSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      // El servicio ahora incluye automáticamente los taxes gracias al movementId
      const invoice = await service.findOne(code, { includeLines: true });
      res.json(invoice);
    } catch (error) { next(error); }
  }
);

// Registrar una factura (Este endpoint suele ser llamado internamente por el archiveInvoice)
router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(createSalesPostInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        // Inyectamos metadatos del usuario autenticado
        username: req.user.username || req.user.email || 'system',
        userId: req.user.userId || req.user.sub
      };
      const result = await service.create(data);
      res.status(201).json(result);
    } catch (error) { next(error); }
  }
);

module.exports = router;
