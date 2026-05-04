const express = require('express');
const passport = require('passport');
const SystemEnumService = require('../services/systemEnums.service');
const validatorHandler = require('./../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  createSystemEnumSchema,
  getSystemEnumSchema,
  updateSystemEnumSchema,
  querySystemEnumSchema
} = require('../schemas/systemEnums.schema');

const router = express.Router();
const service = new SystemEnumService();

// 1. RUTAS ESPECÍFICAS DE BÚSQUEDA
// Esta es la ruta que consume tu SalesInvoiceFieldsHandler.js
router.get('/:model/:field',
  passport.authenticate('jwt', { session: false }),
  // Permitimos que cualquiera con acceso a ventas o gestión vea los enums para rellenar selects
  checkPermission('allowSales'),
  validatorHandler(querySystemEnumSchema, 'params'),
  async (req, res, next) => {
    try {
      const { model, field } = req.params;
      const enums = await service.findByField(model, field);
      res.json({ success: true, data: enums });
    } catch (error) {
      next(error);
    }
  }
);

// 2. RUTAS BASE (CRUD GESTIÓN)
router.get('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSettings'),
  async (req, res, next) => {
    try {
      const list = await service.find();
      res.json(list);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSettings'),
  validatorHandler(createSystemEnumSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newEnum = await service.create(body);
      res.status(201).json(newEnum);
    } catch (error) {
      next(error);
    }
  }
);

// 3. RUTAS CON PARÁMETROS DINÁMICOS POR ID
router.patch('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSettings'),
  validatorHandler(getSystemEnumSchema, 'params'),
  validatorHandler(updateSystemEnumSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = req.body;
      const result = await service.update(id, body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSettings'),
  validatorHandler(getSystemEnumSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await service.delete(id);
      res.status(200).json({ id });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
