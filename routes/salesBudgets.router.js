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
    passport.authenticate('jwt', { session: false }),
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

// Obtener presupuestos aprobados por código de cliente (para selector en facturas)
router.get('/by-customer/:entityCode',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    async (req, res, next) => {
        try {
            const { entityCode } = req.params;
            const budgets = await service.findByCustomer(entityCode);
            res.json({
                success: true,
                data: budgets
            });
        } catch (error) {
            next(error);
        }
    }
);

// Obtener un presupuesto específico por su ID (PK)
// Cambiado :code por :id para sincronizar con getSalesBudgetSchema
router.get('/:id',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesBudgetSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const includeLines = req.query.include_lines === 'true' || req.query.includeLines === 'true';
            const record = await service.findOne(id, { includeLines });

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
            const userId = req.user.userId || req.user.sub;
            const newSalesBudget = await service.create(body, userId);
            res.status(201).json(newSalesBudget);
        } catch (error) {
            if (error.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({
                    success: false,
                    message: `El recurso ya existe en el sistema (conflicto de código o UUID).`,
                    error: error.errors
                });
            }
            next(error);
        }
    }
);

// Actualización completa por ID
router.put('/:id',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesBudgetSchema, 'params'),
    validatorHandler(updateSalesBudgetSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const body = req.body;
            const userId = req.user.userId || req.user.sub;
            const record = await service.update(id, body, userId);
            res.json(record);
        } catch (error) {
            next(error);
        }
    }
);

// Eliminación por ID
router.delete('/:id',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSettings'),
    validatorHandler(getSalesBudgetSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const userId = req.user.userId || req.user.sub;
            await service.delete(id, userId);
            res.status(200).json({ id });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
