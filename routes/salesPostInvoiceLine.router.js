const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const SalesPostInvoiceLineService = require('../services/salesPostInvoiceLines.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');

const {
  getSalesPostInvoiceLineSchema,
  querySalesPostInvoiceLineSchema
} = require('../schemas/salesPostInvoiceLine.schema');

const router = express.Router();
const service = new SalesPostInvoiceLineService();

/**
 * CONSULTAS DE LÍNEAS REGISTRADAS (SÓLO LECTURA)
 */

// Listado paginado de todas las líneas
router.get('/salesPostInvoiceLines-paginated',
  passport.authenticate('jwt', { session: false }), // 2. Autenticación obligatoria
  checkPermission('allowSales'), // 3. Permiso unificado (Ventas)
  validatorHandler(querySalesPostInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Obtener una línea específica por su clave primaria compuesta
router.get('/:codeDocument/:lineNo',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(getSalesPostInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const line = await service.findOne({ codeDocument, lineNo });
      res.json(line);
    } catch (error) {
      next(error);
    }
  }
);

// Listado general por filtros
router.get('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(querySalesPostInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const lines = await service.find(req.query);
      res.json(lines);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
