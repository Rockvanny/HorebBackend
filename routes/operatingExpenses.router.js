const express = require('express');
const passport = require('passport');
const OperatingExpensesService = require('../services/operatingExpenses.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkAction, checkRole } = require('../middlewares/auth.handler');
const { isExpenseMonthClosed } = require('../libs/monthClose.helper');
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
  checkAction('VIEW_OPERATINGEXPENSES'),
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
 * RESUMEN DE SOLO LECTURA PARA LA APP MÓVIL (pestaña "Gestión", exclusiva de
 * admin -checkRole, no basta con checkAction: financiero/vendedor también
 * podrían tener el módulo Gestión activo-). Filtrable por rango de fechas.
 * Va ANTES de '/:id' a propósito, si no Express interpretaría
 * "mobile-summary" como el :id de la ruta de abajo.
 */
router.get('/mobile-summary',
  passport.authenticate('jwt', { session: false }),
  checkRole('admin'),
  validatorHandler(queryOperatingExpenseSchema, 'query'),
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      const result = await service.findMobileSummary({ startDate, endDate });
      res.json({ success: true, data: result });
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
  checkAction('VIEW_OPERATINGEXPENSES'),
  validatorHandler(getOperatingExpenseSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const expense = await service.findOne(id);
      const data = expense.toJSON();
      data.locked = expense.isValidated || isExpenseMonthClosed(expense.date);
      res.json(data);
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
  checkAction('CREATE_OPERATINGEXPENSES'),
  validatorHandler(createOperatingExpenseSchema, 'body'),
  async (req, res, next) => {
    try {
      const userId = req.user.code;
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
  checkAction('VIEW_OPERATINGEXPENSES'),
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
  checkAction('UPDATE_OPERATINGEXPENSES'),
  validatorHandler(getOperatingExpenseSchema, 'params'),
  validatorHandler(updateOperatingExpenseSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.code;
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
  checkAction('DELETE_OPERATINGEXPENSES'),
  validatorHandler(getOperatingExpenseSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.code;
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
  checkAction('UPDATE_OPERATINGEXPENSES'),
  async (req, res, next) => {
    try {
      const userId = req.user.code;
      const result = await service.validatePreviousMonth(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
