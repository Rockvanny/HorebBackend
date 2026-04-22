const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const VerifactuService = require('../services/verifactulogs.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const { getVerifactuLogSchema, queryVerifactuLogSchema } = require('../schemas/verifactuLogs.schema');

const router = express.Router();
const service = new VerifactuService();

/**
 * LISTADO GENERAL DE LOGS (Auditoría administrativa)
 */
router.get('/',
  passport.authenticate('jwt', { session: false }), // 2. Autenticación obligatoria
  checkPermission('allowGestion'), // 3. Permiso de administración/configuración
  validatorHandler(queryVerifactuLogSchema, 'query'),
  async (req, res, next) => {
    try {
      const logs = await service.findPaginated(req.query);
      res.json(logs);
    } catch (error) { next(error); }
  }
);

/**
 * TRAZABILIDAD POR FACTURA
 * Se permite a usuarios de Ventas para que puedan verificar el estado de envío de una factura.
 */
router.get('/:invoiceCode',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'), // Vinculado a quien puede ver facturas registradas
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
 * Acción administrativa para reintentar envíos fallidos.
 */
router.post('/generate/:invoiceCode',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(getVerifactuLogSchema, 'params'),
  async (req, res, next) => {
    try {
      const { invoiceCode } = req.params;
      // Inyectamos el usuario que dispara la acción para el log
      const userId = req.user.userId || req.user.sub;
      const isTest = process.env.NODE_ENV !== 'production';

      const log = await service.createLog(invoiceCode, isTest, userId);
      res.status(201).json(log);
    } catch (error) { next(error); }
  }
);

module.exports = router;
