const express = require('express');
const SalesPostInvoiceLineService = require('../services/salesPostInvoiceLines.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');

// Esquemas normalizados (usando codeDocument como el borrador)
const {
  getSalesPostInvoiceLineSchema,
  querySalesPostInvoiceLineSchema
} = require('../schemas/salesPostInvoiceLine.schema');

const router = express.Router();
const service = new SalesPostInvoiceLineService();

/**
 * CONSULTAS DE LÍNEAS REGISTRADAS (SÓLO LECTURA)
 */

// Listado paginado de todas las líneas (útil para auditorías o informes)
router.get('/salesPostInvoiceLines-paginated',
  checkPermission('VIEW_SALESPOSTINVOICES'),
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
// Normalizado a :codeDocument/:lineNo para coincidir con el borrador
router.get('/:codeDocument/:lineNo',
  checkPermission('VIEW_SALESPOSTINVOICES'),
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

// Listado general por filtros (Query params)
router.get('/',
  checkPermission('VIEW_SALESPOSTINVOICES'),
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

/**
 * NOTA: No existen rutas POST, PATCH ni DELETE.
 * Las líneas de facturas registradas se crean únicamente
 * a través del proceso de registro de la cabecera (atómico).
 */

module.exports = router;
