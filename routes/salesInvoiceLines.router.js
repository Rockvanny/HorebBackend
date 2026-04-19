const express = require('express');
const SalesInvoiceLineService = require('../services/salesInvoiceLine.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');

const {
  createSalesInvoiceLineSchema,
  getSalesInvoiceLineSchema,
  updateSalesInvoiceLineSchema,
  querySalesInvoiceLineSchema
} = require('../schemas/salesInvoiceLine.schema');

const router = express.Router();
const service = new SalesInvoiceLineService();

/**
 * 1. LECTURA DE LÍNEAS (Rutas estáticas arriba)
 */

// GET /salesInvoiceLines-paginated - Listado con filtros
router.get('/salesInvoiceLines-paginated',
  checkPermission('VIEW_SALESINVOICES'),
  validatorHandler(querySalesInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const { limit, offset, searchTerm } = req.query;
      const result = await service.findPaginated({ limit, offset, searchTerm });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET / - Listado general (Sincronizado con findPaginated)
router.get('/',
  checkPermission('VIEW_SALESINVOICES'),
  validatorHandler(querySalesInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result.records); // Devolvemos solo los registros para mantener compatibilidad
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 2. ACCIONES POR PK COMPUESTA (codeDocument + lineNo)
 */

// GET /:codeDocument/:lineNo - Obtener una línea específica
router.get('/:codeDocument/:lineNo',
  checkPermission('VIEW_SALESINVOICES'),
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
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

// POST /:codeDocument - Añadir una línea a una factura existente
router.post('/:codeDocument',
  checkPermission('UPDATE_SALESINVOICES'),
  validatorHandler(createSalesInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument } = req.params;
      const body = req.body;
      // Forzamos que el codeDocument del body sea el de la URL
      const newLine = await service.create({ ...body, codeDocument });
      res.status(201).json(newLine);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /:codeDocument/:lineNo - Actualización parcial
router.patch('/:codeDocument/:lineNo',
  checkPermission('UPDATE_SALESINVOICES'),
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
  validatorHandler(updateSalesInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const body = req.body;
      const updatedLine = await service.update({ codeDocument, lineNo }, body);
      res.json(updatedLine);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /:codeDocument/:lineNo - Eliminar línea
router.delete('/:codeDocument/:lineNo',
  checkPermission('UPDATE_SALESINVOICES'),
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const result = await service.delete({ codeDocument, lineNo });
      res.status(200).json({
        ...result,
        message: 'Línea de factura eliminada y totales recalculados automáticamente.'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
