const express = require('express');
const passport = require('passport');
const seriesNumberService = require('../services/seriesNumber.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');

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
    checkPermission('allowGestion'),
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

// 3. Crear una nueva serie
router.post('/',
    checkPermission('allowGestion'),
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

/**
 * IMPORTANTE: Las rutas de PATCH y DELETE ahora usan /:type/:code
 * ya que son tu clave primaria compuesta.
 */

// 4. Actualizar serie
router.patch('/:type/:code',
    checkPermission('allowGestion'),
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

// 5. Eliminar serie
router.delete('/:type/:code',
    checkPermission('allowGestion'),
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
