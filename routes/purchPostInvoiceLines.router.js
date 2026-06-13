// routes/purchPostInvoiceLines.router.js
const express = require('express');
const passport = require('passport');
const PurchPostInvoiceLineService = require('../services/purchPostInvoiceLine.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  getPurchPostInvoiceLineSchema,
  queryPurchPostInvoiceLineSchema
} = require('../schemas/purchPostInvoiceLine.schema');

const router = express.Router();
const service = new PurchPostInvoiceLineService();

// Consulta paginada general
router.get('/paginated',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'),
  validatorHandler(queryPurchPostInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

// Obtener por ID técnico
router.get('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'),
  validatorHandler(getPurchPostInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const line = await service.findOneById(id);
      res.json(line);
    } catch (error) { next(error); }
  }
);

module.exports = router;
