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

/**
 * BUSCAR POR TIPO
 * Ajuste: Añadido validatorHandler para el query param 'type'
 */
router.get('/by-type',
    passport.authenticate('jwt', { session: false }),
    validatorHandler(querySeriesNumberSchema, 'query'), // <-- Validación añadida
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
    checkPermission('allowGestion'),
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
 * Ajuste: Asegurar que el campo de auditoría coincida con el schema (username)
 */
router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowGestion'),
    validatorHandler(createSeriesNumberSchema, 'body'),
    async (req, res, next) => {
        try {
            const data = {
                ...req.body,
                // Si en el modelo de Sequelize el atributo se llama 'username'
                username: req.user.username || req.user.sub
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
 * Nota: Aquí el validatorHandler de params ya cubre 'type' y 'startSerie'
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
