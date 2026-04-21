const express = require('express');
const VerifactuService = require('../services/verifactulogs.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const { getVerifactuLogSchema, queryVerifactuLogSchema } = require('../schemas/verifactuLogs.schema');

const router = express.Router();
const service = new VerifactuService();

router.get('/',
  checkPermission('ADMIN_VERIFACTU'),
  validatorHandler(queryVerifactuLogSchema, 'query'),
  async (req, res, next) => {
    try {
      const logs = await service.findPaginated(req.query);
      res.json(logs);
    } catch (error) { next(error); }
  }
);

router.get('/:invoiceCode',
  checkPermission('VIEW_SALESPOSTINVOICES'),
  validatorHandler(getVerifactuLogSchema, 'params'),
  async (req, res, next) => {
    try {
      const { invoiceCode } = req.params;
      const trace = await service.getTraceability(invoiceCode);
      res.json(trace);
    } catch (error) { next(error); }
  }
);

router.post('/generate/:invoiceCode',
  checkPermission('ADMIN_VERIFACTU'),
  validatorHandler(getVerifactuLogSchema, 'params'),
  async (req, res, next) => {
    try {
      const { invoiceCode } = req.params;
      const isTest = process.env.NODE_ENV !== 'production';
      const log = await service.createLog(invoiceCode, isTest);
      res.status(201).json(log);
    } catch (error) { next(error); }
  }
);

module.exports = router;
