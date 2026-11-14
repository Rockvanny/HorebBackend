const express = require('express');
const passport = require('passport');
const ExpenseCategoriesService = require('../services/expenseCategories.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkRole } = require('../middlewares/auth.handler');
const {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  getExpenseCategorySchema,
  expenseCategoryOptionsSchema
} = require('../schemas/expenseCategory.schema');

const router = express.Router();
const service = new ExpenseCategoriesService();

const authenticated = passport.authenticate('jwt', { session: false });

/**
 * Desplegables de categoría (proveedores, gastos operativos, facturas de
 * compra): cualquier usuario del escritorio. Sustituye a
 * /enums/<modelo>/category, que dejó de existir al pasar de ENUM a tabla.
 */
router.get('/options',
  authenticated,
  validatorHandler(expenseCategoryOptionsSchema, 'query'),
  async (req, res, next) => {
    try {
      res.json({ success: true, data: await service.options(req.query) });
    } catch (error) { next(error); }
  }
);

/**
 * Mantenimiento (Configuración › Categorías de gasto): admin y financiero,
 * igual que el resto de Configuración que ve financiero (ver
 * config/access-manager.js#ROLE_PAGES).
 */
const canManage = [authenticated, checkRole('admin', 'financiero')];

router.get('/expense-categories-paginated',
  ...canManage,
  async (req, res, next) => {
    try {
      const { limit, offset, searchTerm } = req.query;
      res.json(await service.findPaginated({ limit, offset, searchTerm }));
    } catch (error) { next(error); }
  }
);

router.get('/:id',
  ...canManage,
  validatorHandler(getExpenseCategorySchema, 'params'),
  async (req, res, next) => {
    try {
      res.json({ success: true, data: await service.findOne(req.params.id) });
    } catch (error) { next(error); }
  }
);

router.post('/',
  ...canManage,
  validatorHandler(createExpenseCategorySchema, 'body'),
  async (req, res, next) => {
    try {
      res.status(201).json({ success: true, data: await service.create(req.body) });
    } catch (error) { next(error); }
  }
);

router.patch('/:id',
  ...canManage,
  validatorHandler(getExpenseCategorySchema, 'params'),
  validatorHandler(updateExpenseCategorySchema, 'body'),
  async (req, res, next) => {
    try {
      res.json({ success: true, data: await service.update(req.params.id, req.body) });
    } catch (error) { next(error); }
  }
);

router.delete('/:id',
  ...canManage,
  validatorHandler(getExpenseCategorySchema, 'params'),
  async (req, res, next) => {
    try {
      res.json({ success: true, data: await service.delete(req.params.id) });
    } catch (error) { next(error); }
  }
);

module.exports = router;
