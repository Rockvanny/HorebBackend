const express = require('express');
const seriesNumberService = require('../services/seriesNumber.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');

const {
  createSeriesNumberSchema,
  updateSeriesNumberSchema,
  getSeriesNumberSchema,
  querySeriesNumberSchema,
  // Asegúrate de añadir este en tu archivo de schemas:
  // getSeriesByTypeSchema = Joi.object({ type: Joi.string().required() })
} = require('../schemas/seriesNumber.schema');

const router = express.Router();
const service = new seriesNumberService();

/**
 * BUSCAR POR TIPO (Para selectores de Clientes, Facturas, etc.)
 * Esta ruta NO lleva checkPermission de Settings porque cualquier
 * usuario que pueda crear un cliente necesita listar las series.
 */
router.get('/by-type',
  async (req, res, next) => {
    try {
      const { type } = req.query; // ?type=customer
      const series = await service.findByType(type);
      res.json({
        success: true,
        data: series
      });
    } catch (error) {
      next(error);
    }
});

/**
 * LISTADO GENERAL (Configuración)
 */
router.get('/',
  checkPermission('allowSettings'),
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
 * CREAR, ACTUALIZAR Y ELIMINAR (Se mantienen abajo)
 */
router.post('/',
  checkPermission('allowSettings'),
  validatorHandler(createSeriesNumberSchema, 'body'),
  async (req, res, next) => {
    try {
      // Usamos el ID de usuario del token para la auditoría
      const data = { ...req.body, user_name: req.user.sub };
      const newSerie = await service.create(data);
      res.status(201).json(newSerie);
    } catch (error) {
      next(error);
    }
  }
);

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
