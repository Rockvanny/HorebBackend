const express = require('express');
const passport = require('passport');
const VerifactuService = require('../services/verifactulogs.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const { 
    updateExternalReferenceSchema 
} = require('../schemas/verifactuLogs.schema');

const router = express.Router();
const service = new VerifactuService();

/**
 * LISTADO PAGINADO
 */
router.get('/logs-paginated',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowGestion'),
    async (req, res, next) => {
        try {
            const result = await service.findPaginated(req.query);
            res.json(result);
        } catch (error) { next(error); }
    }
);

/**
 * DETALLE POR ID
 */
router.get('/:id',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const log = await service.findOne(id);
            res.json({
                success: true,
                data: log
            });
        } catch (error) { next(error); }
    }
);

/**
 * ACTUALIZACIÓN DE REFERENCIA AEAT (PATCH)
 * Solo permite modificar external_reference
 */
router.patch('/:id',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowGestion'),
    validatorHandler(updateExternalReferenceSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const body = req.body;
            const result = await service.update(id, body);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) { next(error); }
    }
);

module.exports = router;