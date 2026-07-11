const express = require('express');
const passport = require('passport');
const seriesNumberService = require('../services/seriesNumber.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkAction } = require('../middlewares/auth.handler');

const {
  createSeriesNumberSchema,
  updateSeriesNumberSchema,
  getSeriesNumberSchema,
  querySeriesNumberSchema
} = require('../schemas/seriesNumber.schema');

const router = express.Router();
const service = new seriesNumberService();

// Middleware de autenticación para todas las rutas
router.use(passport.authenticate('jwt', { session: false }));

// 1. Obtener series paginadas para el Explorer
router.get('/series-paginated',
 // checkAction('VIEW_SERIES'),
  validatorHandler(querySeriesNumberSchema, 'query'),
  async (req, res, next) => {
    try {
      const { limit, offset, type, searchTerm } = req.query;
      const result = await service.findPaginated({ limit, offset, type, searchTerm });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// 2. Obtener series por tipo (para llenar Selectores/Dropdowns)
router.get('/by-type',
 // checkAction('VIEW_SERIES'),
  validatorHandler(querySeriesNumberSchema, 'query'),
  async (req, res, next) => {
    try {
      const { type } = req.query;
      const series = await service.findByType(type);
      res.json(series);
    } catch (error) {
      next(error);
    }
  }
);

// 3. Obtener el diccionario de tipos disponibles
router.get('/config/types',
 // checkAction('VIEW_SERIES'),
  async (req, res, next) => {
    try {
      const types = await service.getAvailableTypes();
      res.json({ success: true, data: types });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * NUEVA RUTA: Obtener series candidatas para vinculación (Posting)
 * Se coloca antes de /:type/:code para evitar conflictos de rutas
 */
router.get('/config/post-series/:type',
 // checkAction('VIEW_SERIES'),
  async (req, res, next) => {
    try {
      const { type } = req.params;
      const series = await service.getPostSeries(type);
      res.json({ success: true, data: series });
    } catch (error) {
      next(error);
    }
  }
);

// 4. Obtener una serie específica
router.get('/:type/:code',
 // checkAction('VIEW_SERIES'),
  validatorHandler(getSeriesNumberSchema, 'params'),
  async (req, res, next) => {
    try {
      const { type, code } = req.params;
      const serie = await service.findOne(type, code);
      res.json({
        success: true,
        data: serie
      });
    } catch (error) {
      next(error);
    }
  }
);

// 5. Crear una nueva serie
router.post('/',
 // checkAction('CREATE_SERIES'),
  validatorHandler(createSeriesNumberSchema, 'body'),
  async (req, res, next) => {
    try {
      const executor = req.user.userId || req.user.sub;
      const newSerie = await service.create(req.body, executor);
      res.status(201).json(newSerie);
    } catch (error) {
      next(error);
    }
  }
);

// 6. Actualizar serie
router.patch('/:type/:code',
 // checkAction('UPDATE_SERIES'),
  validatorHandler(getSeriesNumberSchema, 'params'),
  validatorHandler(updateSeriesNumberSchema, 'body'),
  async (req, res, next) => {
    try {
      const { type, code } = req.params;
      const executor = req.user.userId || req.user.sub;
      const updated = await service.update(type, code, req.body, executor);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// 7. Eliminar serie
router.delete('/:type/:code',
 // checkAction('DELETE_SERIES'),
  validatorHandler(getSeriesNumberSchema, 'params'),
  async (req, res, next) => {
    try {
      const { type, code } = req.params;
      const executor = req.user.userId || req.user.sub;
      const result = await service.delete(type, code, executor);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
