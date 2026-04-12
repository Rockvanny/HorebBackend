const express = require('express');
const seriesNumberService = require('../services/seriesNumber.service');
const validatorHandler = require('../middlewares/validator.handler');

// Importamos el middleware de permisos
const { checkPermission } = require('../middlewares/auth.handler');

const {
  createSeriesNumberSchema,
  updateSeriesNumberSchema,
  getSeriesNumberSchema,
  querySeriesNumberSchema
} = require('../schemas/seriesNumber.schema');

const router = express.Router();
const service = new seriesNumberService();

/**
 * LISTADO DE SERIES
 * Generalmente para verlas en el panel de Ajustes.
 */
router.get('/',
  checkPermission('allowSettings'), // Solo usuarios con acceso a configuración
  validatorHandler(querySeriesNumberSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * CREAR NUEVA SERIE (Ej: Al iniciar el año 2027)
 */
router.post('/',
  checkPermission('allowSettings'),
  validatorHandler(createSeriesNumberSchema, 'body'),
  async (req, res, next) => {
    try {
      // Pasamos el userId para saber quién creó la serie
      const data = { ...req.body, username: req.user.userId };
      const newSerie = await service.create(data);
      res.status(201).json(newSerie);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ACTUALIZAR SERIE
 */
router.patch('/:type/:startSerie',
  checkPermission('allowSettings'),
  validatorHandler(getSeriesNumberSchema, 'params'),
  validatorHandler(updateSeriesNumberSchema, 'body'),
  async (req, res, next) => {
    try {
      const { type, startSerie } = req.params;
      const updated = await service.update(type, startSerie, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ELIMINAR SERIE
 * ¡Peligro! Solo permitimos borrar si tienes permisos de configuración.
 */
router.delete('/:type/:startSerie',
  checkPermission('allowSettings'),
  validatorHandler(getSeriesNumberSchema, 'params'),
  async (req, res, next) => {
    try {
      const { type, startSerie } = req.params;
      const result = await service.delete(type, startSerie);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
