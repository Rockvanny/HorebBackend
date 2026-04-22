const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const Joi = require('joi');
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
  passport.authenticate('jwt', { session: false }), // 2. Autenticación obligatoria
  checkPermission('allowPurchases'), // 3. Permiso unificado
  validatorHandler(queryPurchInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

router.get('/:codeDocument/:lineNo',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'),
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
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'), // Crear líneas es parte de la gestión de compras
  validatorHandler(Joi.object({ codeDocument: Joi.string().required() }), 'params'),
  validatorHandler(createPurchInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument } = req.params;
      // Ahora puedes usar req.user.userId con seguridad
      const newLine = await service.create({ ...req.body, codeDocument }, req.user.userId);
      res.status(201).json(newLine);
    } catch (error) { next(error); }
  }
);

router.patch('/:codeDocument/:lineNo',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'),
  validatorHandler(getPurchInvoiceLineSchema, 'params'),
  validatorHandler(updatePurchInvoiceLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const line = await service.update({ codeDocument, lineNo }, req.body, req.user.userId);
      res.json(line);
    } catch (error) { next(error); }
  }
);

router.delete('/:codeDocument/:lineNo',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'),
  validatorHandler(getPurchInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const result = await service.delete({ codeDocument, lineNo }, req.user.userId);
      res.json(result);
    } catch (error) { next(error); }
  }
);

module.exports = router;
