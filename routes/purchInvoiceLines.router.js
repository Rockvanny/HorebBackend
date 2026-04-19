const express = require('express');
const Joi = require('joi'); // Importante para la validación del codeDocument en POST
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
 * CONSULTAS DE LÍNEAS (VIEW)
 */

router.get('/paginated',
  checkPermission('VIEW_PURCHINVOICES'), // Protegido
  validatorHandler(queryPurchInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

router.get('/:codeDocument/:lineNo',
  checkPermission('VIEW_PURCHINVOICES'), // Protegido
  validatorHandler(getPurchInvoiceLineSchema, 'params'),
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
  checkPermission('UPDATE_PURCHINVOICES'), // Crear líneas es parte de editar la compra
  validatorHandler(Joi.object({ codeDocument: Joi.string().required() }), 'params'),
  validatorHandler(createPurchInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument } = req.params;
      const newLine = await service.create({ ...req.body, codeDocument });
      res.status(201).json(newLine);
    } catch (error) { next(error); }
  }
);

router.patch('/:codeDocument/:lineNo',
  checkPermission('UPDATE_PURCHINVOICES'), // Protegido
  validatorHandler(getPurchInvoiceLineSchema, 'params'),
  validatorHandler(updatePurchInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const line = await service.update({ codeDocument, lineNo }, req.body);
      res.json(line);
    } catch (error) { next(error); }
  }
);

router.delete('/:codeDocument/:lineNo',
  checkPermission('UPDATE_PURCHINVOICES'), // Borrar una línea suele requerir permiso de edición
  validatorHandler(getPurchInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const result = await service.delete({ codeDocument, lineNo });
      res.json(result);
    } catch (error) { next(error); }
  }
);

module.exports = router;
