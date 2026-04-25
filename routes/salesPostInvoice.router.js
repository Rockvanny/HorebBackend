const express = require('express');
const passport = require('passport');
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

router.get('/:code',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(getSalesPostInvoiceSchema, 'params'), // Reutilizamos lógica de código
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const invoice = await service.findOne(code, { includeLines: true });
      res.json(invoice);
    } catch (error) { next(error); }
  }
);

router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(createSalesPostInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        username: req.user.username || req.user.email,
        userId: req.user.userId || req.user.sub
      };
      const result = await service.create(data);
      res.status(201).json(result);
    } catch (error) { next(error); }
  }
);

module.exports = router;
