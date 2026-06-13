// routes/purchPostInvoices.router.js
const express = require('express');
const passport = require('passport');
const PurchPostInvoiceService = require('../services/purchPostInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  createPurchPostInvoiceSchema,
  getPurchPostInvoiceSchema,
  queryPurchPostInvoiceSchema
} = require('../schemas/purchPostInvoice.schema');

const router = express.Router();
const service = new PurchPostInvoiceService();

// Listado paginado con soporte para términos de búsqueda
router.get('/purchPostInvoices-paginated',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
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

// Listado de histórico (facturas registradas)
router.get('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'),
  validatorHandler(queryPurchPostInvoiceSchema, 'query'),
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
  checkPermission('allowPurchases'),
  // Validamos que el parámetro 'code' cumpla con el esquema getPurchPostInvoiceSchema
  validatorHandler(getPurchPostInvoiceSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      // El servicio ahora incluye automáticamente las líneas y se expone directo como en ventas
      const invoice = await service.findOne(code, { includeLines: true });
      res.json(invoice);
    } catch (error) { next(error); }
  }
);

// Registrar una factura (Este endpoint suele ser llamado internamente por el archiveInvoice)
router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'),
  validatorHandler(createPurchPostInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        // Inyectamos metadatos del usuario autenticado respetando las propiedades del modelo de compras
        userName: req.user.username || req.user.email || 'system',
        userId: req.user.userId || req.user.sub
      };
      const result = await service.create(data);
      res.status(201).json(result);
    } catch (error) { next(error); }
  }
);

module.exports = router;
