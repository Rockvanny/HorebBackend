const express = require('express');
const passport = require('passport');
const SalesPostInvoiceLineService = require('../services/salesPostInvoiceLines.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkAction } = require('../middlewares/auth.handler');
const {
  getSalesPostInvoiceLineSchema,
  querySalesPostInvoiceLineSchema
} = require('../schemas/salesPostInvoiceLine.schema');

const router = express.Router();
const service = new SalesPostInvoiceLineService();

// Consulta paginada general
router.get('/paginated',
  passport.authenticate('jwt', { session: false }),
  //('VIEW_SALESPOSTINVOICES'),
  validatorHandler(querySalesPostInvoiceLineSchema, 'query'),
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
  //checkAction('VIEW_SALESPOSTINVOICES'),
  validatorHandler(getSalesPostInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const line = await service.findOneById(id);
      res.json(line);
    } catch (error) { next(error); }
  }
);

module.exports = router;
