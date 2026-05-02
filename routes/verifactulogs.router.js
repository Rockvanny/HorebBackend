const express = require('express');
const passport = require('passport');
const VerifactuService = require('../services/verifactulogs.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const { getVerifactuLogSchema, queryVerifactuLogSchema } = require('../schemas/verifactuLogs.schema');

const router = express.Router();
const service = new VerifactuService();

/**
 * LISTADO GENERAL DE LOGS (Auditoría administrativa)
 * Paginación integrada con el componente Explorer
 */
router.get('/logs-paginated',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(queryVerifactuLogSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

/**
 * TRAZABILIDAD POR FACTURA
 */
router.get('/:invoiceCode',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(getVerifactuLogSchema, 'params'),
  async (req, res, next) => {
    try {
      const { invoiceCode } = req.params;
      const trace = await service.getTraceability(invoiceCode);
      res.json(trace);
    } catch (error) { next(error); }
  }
);

/**
 * GENERACIÓN MANUAL DE LOG/ENVÍO
 */
router.post('/generate/:invoiceCode',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
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
