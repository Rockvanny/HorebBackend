// routes/purchInvoiceLines.router.js
const express = require('express');
const PurchInvoiceLineService = require('../services/purchInvoiceLine.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');

const {
  createPurchInvoiceLineSchema,
  getPurchInvoiceLineSchema,
  updatePurchInvoiceLineSchema,
  queryPurchInvoiceLineSchema
} = require('../schemas/purchInvoiceLine.schema');

const router = express.Router();
const service = new PurchInvoiceLineService();

/**
 * 1. LECTURA DE LÍNEAS
 */

// GET /purchInvoiceLines-paginated - Listado con filtros
router.get('/purchInvoiceLines-paginated',
  checkPermission('VIEW_PURCHINVOICES'), // Permiso de visualización de compras
  validatorHandler(queryPurchInvoiceLineSchema, 'query'),
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

// GET / - Listado general (usando la lógica de paginación por defecto)
router.get('/',
  checkPermission('VIEW_PURCHINVOICES'),
  validatorHandler(queryPurchInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result.records);
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
  checkPermission('VIEW_PURCHINVOICES'),
  validatorHandler(getPurchInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const line = await service.findOne({ codeDocument, lineNo });
      res.json(line);
    } catch (error) {
      next(next);
    }
  }
);

// POST /:codeDocument - Añadir línea a una factura de compra existente
router.post('/:codeDocument',
  checkPermission('UPDATE_PURCHINVOICES'), // Alterar una compra existente requiere permiso de edición
  validatorHandler(createPurchInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument } = req.params;
      const body = req.body;
      // Inyectamos el codeDocument de la URL en el objeto de creación
      const newLine = await service.create({ ...body, codeDocument });
      res.status(201).json(newLine);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /:codeDocument/:lineNo - Actualización parcial de línea
router.patch('/:codeDocument/:lineNo',
  checkPermission('UPDATE_PURCHINVOICES'),
  validatorHandler(getPurchInvoiceLineSchema, 'params'),
  validatorHandler(updatePurchInvoiceLineSchema, 'body'),
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

// DELETE /:codeDocument/:lineNo - Eliminar línea de compra
router.delete('/:codeDocument/:lineNo',
  checkPermission('UPDATE_PURCHINVOICES'),
  validatorHandler(getPurchInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const result = await service.delete({ codeDocument, lineNo });
      res.status(200).json({
        ...result,
        message: 'Línea de compra eliminada y totales de la factura recalculados.'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
