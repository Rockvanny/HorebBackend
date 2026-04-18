// routes/salesBudgetLines.router.js
const express = require('express');
const Joi = require('joi'); // Importante para la validación del codeDocument en POST
const salesBudgetLineService = require('../services/salesBudgetsLines.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler'); // Importar middleware
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
  checkPermission('VIEW_SALESBUDGETS'), // Protegido
  validatorHandler(querySalesBudgetLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

router.get('/:codeDocument/:lineNo',
  checkPermission('VIEW_SALESBUDGETS'), // Protegido
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
  checkPermission('UPDATE_SALESBUDGETS'), // Crear líneas es parte de editar el presupuesto
  validatorHandler(Joi.object({ codeDocument: Joi.string().required() }), 'params'),
  validatorHandler(createSalesBudgetLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument } = req.params;
      const newLine = await service.create({ ...req.body, codeDocument });
      res.status(201).json(newLine);
    } catch (error) { next(error); }
  }
);

router.patch('/:codeDocument/:lineNo',
  checkPermission('UPDATE_SALESBUDGETS'), // Protegido
  validatorHandler(getSalesBudgetLineSchema, 'params'),
  validatorHandler(updateSalesBudgetLineSchema, 'body'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const line = await service.update({ codeDocument, lineNo }, req.body);
      res.json(line);
    } catch (error) { next(error); }
  }
);

router.delete('/:codeDocument/:lineNo',
  checkPermission('UPDATE_SALESBUDGETS'), // Borrar una línea suele requerir permiso de edición
  validatorHandler(getSalesBudgetLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { codeDocument, lineNo } = req.params;
      const result = await service.delete({ codeDocument, lineNo });
      res.json(result);
    } catch (error) { next(error); }
  }
);

module.exports = router;
