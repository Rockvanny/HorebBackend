const express = require('express');
const SalesInvoiceLineService = require('../services/salesInvoiceLines.service');
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
 * LECTURA DE LÍNEAS
 */

// GET /paginated - Listado con filtros
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

// GET /:codeInvoice/:lineNo - Una línea específica (PK compuesta)
router.get('/:codeInvoice/:lineNo',
  checkPermission('VIEW_SALESINVOICES'),
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeInvoice, lineNo } = req.params;
      const salesInvoiceLine = await service.findOne({ codeInvoice, lineNo });
      res.json(salesInvoiceLine);
    } catch (error) {
      next(error);
    }
  }
);

// GET / - Listado general
router.get('/',
  checkPermission('VIEW_SALESINVOICES'),
  validatorHandler(querySalesInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const SalesInvoiceLines = await service.find(req.query);
      res.json(SalesInvoiceLines);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ESCRITURA DE LÍNEAS
 */

// POST /:codeInvoice - Añadir una línea a una factura existente
router.post('/:codeInvoice',
  checkPermission('UPDATE_SALESINVOICES'), // Usamos UPDATE porque altera una factura existente
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
  validatorHandler(createSalesInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeInvoice } = req.params;
      const body = req.body;
      const newSalesInvoiceLine = await service.create({ ...body, codeInvoice });
      res.status(201).json(newSalesInvoiceLine);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `La línea ${req.body.lineNo} ya existe para la factura ${req.params.codeInvoice}.`,
          error: error.errors
        });
      }
      next(error);
    }
  }
);

// PATCH /:codeInvoice/:lineNo - Actualización parcial de una línea
router.patch('/:codeInvoice/:lineNo',
  checkPermission('UPDATE_SALESINVOICES'),
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
  validatorHandler(updateSalesInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeInvoice, lineNo } = req.params;
      const body = req.body;
      const salesInvoiceLine = await service.update({ codeInvoice, lineNo }, body);
      res.json(salesInvoiceLine);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /:codeInvoice/:lineNo - Eliminar una línea específica
router.delete('/:codeInvoice/:lineNo',
  checkPermission('UPDATE_SALESINVOICES'),
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeInvoice, lineNo } = req.params;
      await service.delete({ codeInvoice, lineNo });
      res.status(200).json({
        codeInvoice,
        lineNo,
        message: 'Línea de factura eliminada y totales recalculados.'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
