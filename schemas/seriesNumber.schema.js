const express = require('express');
const seriesNumberService = require('../services/seriesNumber.service');
const validatorHandler = require('../middlewares/validator.handler');
const {
  createSeriesNumberSchema,
  updateSeriesNumberSchema,
  getSeriesNumberSchema,
  querySeriesNumberSchema
} = require('../schemas/seriesNumber.schema');

const router = express.Router();
const service = new seriesNumberService();

// LISTADO PAGINADO
router.get('/',
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

// OBTENER UNA
router.get('/:type/:startSerie',
  validatorHandler(getSeriesNumberSchema, 'params'),
  async (req, res, next) => {
    try {
      const { type, startSerie } = req.params;
      const serie = await service.findOne(type, startSerie);
      res.json(serie);
    } catch (error) {
      next(error);
    }
  }
);

// CREAR (Aquí es donde el administrador define el prefijo, ceros y fechas)
router.post('/',
  validatorHandler(createSeriesNumberSchema, 'body'),
  async (req, res, next) => {
    try {
      const newSerie = await service.create(req.body);
      res.status(201).json(newSerie);
    } catch (error) {
      next(error);
    }
  }
);

// ACTUALIZAR
router.patch('/:type/:startSerie',
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

module.exports = router;
