const express = require('express');
const passport = require('passport');
const salesBudgetService = require('../services/salesBudgets.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
    createSalesBudgetSchema,
    getSalesBudgetSchema,
    updateSalesBudgetSchema,
    querySalesBudgetSchema
} = require('../schemas/salesBudgets.schema');

const router = express.Router();
const service = new salesBudgetService();

/**
 * CONSULTAS DE PRESUPUESTOS (VIEW)
 */

// Listado paginado con filtros
router.get('/salesBudgets-paginated',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    async (req, res, next) => {
        try {
            const { limit, offset, searchTerm } = req.query;
            const result = await service.findPaginated({ limit, offset, searchTerm });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// Contador total para estadísticas rápidas (Dashboard)
router.get('/count',
    passport.authenticate('jwt', { session: false }), // <--- Fundamental para evitar el 401 inicial
    checkPermission('allowSales'),
    async (req, res, next) => {
        try {
            const total = await service.countAll();
            res.status(200).json({ total });
        } catch (error) {
            next(error);
        }
    }
);

// Obtener un presupuesto específico
router.get('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesBudgetSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const includeLines = req.query.include_lines === 'true' || req.query.includeLines === 'true';
            const record = await service.findOne(code, { includeLines });

            res.json({
                success: true,
                data: record
            });
        } catch (error) {
            next(error);
        }
    }
);

// Listado general
router.get('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(querySalesBudgetSchema, 'query'),
    async (req, res, next) => {
        try {
            const record = await service.find(req.query);
            res.json(record);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ACCIONES DE ESCRITURA
 */

// Crear nuevo presupuesto
router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(createSalesBudgetSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            // Pasamos el userId para trazabilidad
            const userId = req.user.userId || req.user.sub;
            const newSalesBudget = await service.create(body, userId);
            res.status(201).json(newSalesBudget);
        } catch (error) {
            if (error.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({
                    success: false,
                    message: `El código de presupuesto '${req.body.code}' ya existe en el sistema.`,
                    error: error.errors
                });
            }
            next(error);
        }
    }
);

// Actualización completa
router.put('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesBudgetSchema, 'params'),
    validatorHandler(updateSalesBudgetSchema, 'body'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const body = req.body;
            const userId = req.user.userId || req.user.sub;
            const record = await service.update(code, body, userId);
            res.json(record);
        } catch (error) {
            next(error);
        }
    }
);

// Eliminación
router.delete('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSettings'), // Borrar suele ser permiso de Admin/Configuración
    validatorHandler(getSalesBudgetSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const userId = req.user.userId || req.user.sub;
            await service.delete(code, userId);
            res.status(200).json({ code });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
