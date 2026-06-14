const express = require('express');
const passport = require('passport');
const OperatingExpensesService = require('../services/operatingExpenses.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  createOperatingExpenseSchema,
  getOperatingExpenseSchema,
  updateOperatingExpenseSchema,
  queryOperatingExpenseSchema // Asegúrate de tener este schema creado
} = require('../schemas/operatingExpenses.schema');

const router = express.Router();
const service = new OperatingExpensesService();

/**
 * LISTADO PAGINADO
 */
router.get('/operatingExpenses-paginated',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(queryOperatingExpenseSchema, 'query'),
  async (req, res, next) => {
    try {
      const { limit, offset, startDate, endDate, category, searchTerm } = req.query;
      const result = await service.findPaginated({ limit, offset, startDate, endDate, category, searchTerm });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DETALLE DE GASTO
 */
router.get('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(getOperatingExpenseSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const expense = await service.findOne(id);
      res.json(expense);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * CREACIÓN
 */
router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(createOperatingExpenseSchema, 'body'),
  async (req, res, next) => {
    try {
      const userId = req.user.userId || req.user.sub;
      const newExpense = await service.create(req.body, userId);
      res.status(201).json(newExpense);
    } catch (error) {
      next(error);
    }
  }
);

// En operatingExpenses.router.js
router.get('/report/excel',
  passport.authenticate('jwt', { session: false }),
  // Asegúrate de usar el permiso correspondiente a gastos
  checkPermission('allowExpenses'),
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      // Llamada al método que acabamos de crear en el servicio
      const data = await service.findForReport(startDate, endDate);

      // Serialización para asegurar limpieza de datos
      return res.status(200).json(JSON.parse(JSON.stringify(data)));
    } catch (error) {
      console.error("Error en router.get /operating-expenses/report/excel:", error);
      next(error);
    }
  }
);

/**
 * ACTUALIZACIÓN
 */
router.patch('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(getOperatingExpenseSchema, 'params'),
  validatorHandler(updateOperatingExpenseSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId || req.user.sub;
      const expense = await service.update(id, req.body, userId);
      res.json(expense);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ELIMINACIÓN
 */
router.delete('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(getOperatingExpenseSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId || req.user.sub;
      await service.delete(id, userId);
      res.status(200).json({ id });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ACCIÓN ESPECIAL: VALIDAR MES ANTERIOR
 */
router.post('/validate-previous-month',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  async (req, res, next) => {
    try {
      const userId = req.user.userId || req.user.sub;
      const result = await service.validatePreviousMonth(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
