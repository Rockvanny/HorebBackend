const express = require('express');
const passport = require('passport'); // 1. Importar Passport
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

/**
 * BUSCAR POR TIPO (Para selectores de Clientes, Facturas, etc.)
 * IMPORTANTE: Cualquier usuario autenticado debe poder listar series para trabajar.
 */
router.get('/by-type',
    passport.authenticate('jwt', { session: false }), // 2. Autenticación obligatoria
    async (req, res, next) => {
        try {
            const { type } = req.query;
            const series = await service.findByType(type);
            res.json({
                success: true,
                data: series
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * LISTADO GENERAL (Configuración)
 */
router.get('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowGestion'), // Solo administradores
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
 * CREAR NUEVA SERIE
 */
router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowGestion'),
    validatorHandler(createSeriesNumberSchema, 'body'),
    async (req, res, next) => {
        try {
            // Usamos req.user.username o sub para la auditoría
            const data = {
                ...req.body,
                user_name: req.user.username || req.user.sub
            };
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
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowGestion'),
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
 */
router.delete('/:type/:startSerie',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowGestion'),
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
