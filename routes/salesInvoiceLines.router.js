const express = require('express');
const Joi = require('joi');
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
 * CONSULTAS DE LÍNEAS (VIEW)
 */

router.get('/paginated',
  checkPermission('VIEW_SALESINVOICES'),
  validatorHandler(querySalesInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

router.get('/:codeDocument/:lineNo',
  checkPermission('VIEW_SALESINVOICES'),
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const line = await service.findOne({ codeDocument, lineNo });
      res.json(line);
    } catch (error) { next(error); }
  }
);

/**
 * ACCIONES DE ESCRITURA EN LÍNEAS
 */

router.post('/:codeDocument',
  checkPermission('UPDATE_SALESINVOICES'),
  validatorHandler(Joi.object({ codeDocument: Joi.string().required() }), 'params'),
  validatorHandler(createSalesInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument } = req.params;
      const newLine = await service.create({ ...req.body, codeDocument });
      res.status(201).json(newLine);
    } catch (error) { next(error); }
  }
);

router.patch('/:codeDocument/:lineNo',
  checkPermission('UPDATE_SALESINVOICES'),
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
  validatorHandler(updateSalesInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const line = await service.update({ codeDocument, lineNo }, req.body);
      res.json(line);
    } catch (error) { next(error); }
  }
);

router.delete('/:codeDocument/:lineNo',
  checkPermission('UPDATE_SALESINVOICES'),
  validatorHandler(getSalesInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const result = await service.delete({ codeDocument, lineNo });
      res.json(result);
    } catch (error) { next(error); }
  }
);

module.exports = router;
