// routes/salesBudgetLines.router.js
const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const Joi = require('joi');
const salesBudgetLineService = require('../services/salesBudgetsLines.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  createSalesBudgetLineSchema,
  getSalesBudgetLineSchema,
  updateSalesBudgetLineSchema,
  querySalesBudgetLineSchema
} = require('../schemas/salesBudgetLines.schema');

const router = express.Router();
const service = new salesBudgetLineService();

/**
 * CONSULTAS DE LÍNEAS (VIEW)
 */

router.get('/paginated',
  passport.authenticate('jwt', { session: false }), // 2. Autenticación obligatoria
  checkPermission('allowSales'), // 3. Permiso unificado (Ventas)
  validatorHandler(querySalesBudgetLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

router.get('/:codeDocument/:lineNo',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(getSalesBudgetLineSchema, 'params'),
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
  checkPermission('allowSales'),
  validatorHandler(Joi.object({ codeDocument: Joi.string().required() }), 'params'),
  validatorHandler(createSalesBudgetLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument } = req.params;
      // Usamos req.user.userId para la auditoría
      const userId = req.user.userId || req.user.sub;
      const newLine = await service.create({ ...req.body, codeDocument }, userId);
      res.status(201).json(newLine);
    } catch (error) { next(error); }
  }
);

router.patch('/:codeDocument/:lineNo',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(getSalesBudgetLineSchema, 'params'),
  validatorHandler(updateSalesBudgetLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const userId = req.user.userId || req.user.sub;
      const line = await service.update({ codeDocument, lineNo }, req.body, userId);
      res.json(line);
    } catch (error) { next(error); }
  }
);

router.delete('/:codeDocument/:lineNo',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
  validatorHandler(getSalesBudgetLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const userId = req.user.userId || req.user.sub;
      const result = await service.delete({ codeDocument, lineNo }, userId);
      res.json(result);
    } catch (error) { next(error); }
  }
);

module.exports = router;
