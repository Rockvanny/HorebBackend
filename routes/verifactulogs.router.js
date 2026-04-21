const express = require('express');
const VerifactuService = require('../services/verifactu.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const Joi = require('joi');

const router = express.Router();
const service = new VerifactuService();

// GET /logs - Ver historial de registros (Para auditoría)
router.get('/',
  checkPermission('ADMIN_VERIFACTU'), // Permiso especial de alto nivel
  async (req, res, next) => {
    try {
      const logs = await service.findPaginated(req.query);
      res.json(logs);
    } catch (error) { next(error); }
  }
);

// GET /logs/:invoiceCode - Ver el "sello" de una factura específica
router.get('/:invoiceCode',
  checkPermission('VIEW_SALESPOSTINVOICES'),
  validatorHandler(Joi.object({ invoiceCode: Joi.string().required() }), 'params'),
  async (req, res, next) => {
    try {
      const { invoiceCode } = req.params;
      const trace = await service.getTraceability(invoiceCode);
      res.json(trace);
    } catch (error) { next(error); }
  }
);

// POST /generate/:invoiceCode
// Generalmente esto se llama internamente desde SalesPostInvoiceService,
// pero tener una ruta manual (solo para admins) puede ser útil en caso de error en el proceso.
router.post('/generate/:invoiceCode',
  checkPermission('ADMIN_VERIFACTU'),
  async (req, res, next) => {
    try {
      const { invoiceCode } = req.params;
      const log = await service.createLog(invoiceCode);
      res.status(201).json(log);
    } catch (error) { next(error); }
  }
);

module.exports = router;
