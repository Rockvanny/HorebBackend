const express = require('express');
const boom = require('@hapi/boom');
const seriesNumberService = require('./../services/seriesNumber.service');
const validatorHandler = require('./../middlewares/validator.handler');
const { createSeriesNumberSchema, updateSeriesNumberSchema, getSeriesNumberSchema, getSeriesByTypeSchema, querySeriesNumberSchema } = require('./../schemas/seriesNumber.schema');

const router = express.Router();
const service = new seriesNumberService();

router.get('/seriesNo-paginated', async (req, res, next) => {
  try {
    const { limit, offset, serieNoStart, serieNoType } = req.query;
    const result = await service.findPaginated({ limit, offset, serieNoStart, serieNoType });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/',
  validatorHandler(querySeriesNumberSchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a números serie");
    try {
      // Extrae AMBOS parámetros 'type' y 'startSerie' de req.query
      const { type, startSerie } = req.query;

      if (!startSerie) {
        throw boom.badRequest('El parámetro "startSerie" es requerido para esta consulta.');
      }

      const seriesNumber = await service.findOne(type, startSerie);

      console.timeEnd("Tiempo de consulta a números serie");
      res.json(seriesNumber); // Devolverá un solo objeto o lanzará 404 si no lo encuentra
    } catch (error) {
      next(error);
    }
  }
);

router.get('/by-type', // <--- ¡Esta es tu nueva ruta!
  validatorHandler(getSeriesByTypeSchema, 'query'), // Valida que solo 'type' sea requerido
  async (req, res, next) => {
    console.time("Tiempo de consulta a números serie (por tipo)");
    try {
      const { type } = req.query; // Solo necesitamos 'type' aquí

      const seriesList = await service.findByType(type); // Llama a tu método de servicio findByType

      console.timeEnd("Tiempo de consulta a números serie (por tipo)");
      res.json(seriesList); // Esto debería devolver un ARRAY de numeraciones
    } catch (error) {
      next(error);
    }
  }
);


router.post('/',
  validatorHandler(createSeriesNumberSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newSeriesNumber = await service.create(body);
      res.status(201).json(newSeriesNumber);
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/:type/:startSerie',
  validatorHandler(getSeriesNumberSchema, 'params'),
  async (req, res, next) => {
    try {
      const { type, startSerie } = req.params;
      console.log(type, startSerie);
      const newSerieNumber = await service.updateLastUsedSerie(type, startSerie);
      console.log("PATCH en backend: ", newSerieNumber);
      return res.json({ success: true, data: { lastSerie: newSerieNumber } });
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/details/:type/:startSerie', async (req, res, next) => {
    try {
        const { type, startSerie } = req.params; // Identificadores originales
        const changes = req.body; // Los cambios del frontend

        // Llamada al servicio 'update' corregido
        const updatedSerieNumber = await service.update(type, startSerie, changes);

        res.status(200).json({
            success: true,
            message: 'Numeración actualizada correctamente.',
            data: updatedSerieNumber
        });
    } catch (error) {
        next(error); // Pasa el error al middleware de manejo de errores global
    }
});

router.delete('/:type/:startSerie',
  validatorHandler(getSeriesNumberSchema, 'params'),
  async (req, res, next) => {
    try {
      const { type, startSerie } = req.params;
      await service.delete(type, startSerie);
      res.status(201).json({ type, startSerie });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
