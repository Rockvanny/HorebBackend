const express = require('express');
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
    checkPermission('VIEW_SALESBUDGETS'),
    async(req, res, next) => {
        try {
            const { limit, offset, searchTerm } = req.query;
            const result = await service.findPaginated({ limit, offset, searchTerm });
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// Contador total para estadísticas rápidos
router.get('/count',
    checkPermission('VIEW_SALESBUDGETS'),
    async (req, res, next) => {
        try {
            const total = await service.countAll();
            res.status(200).json({ total });
        } catch (error) {
            next(error);
        }
    }
);

// Obtener un presupuesto específico por código (con inclusiones opcionales)
router.get('/:code',
  checkPermission('VIEW_SALESBUDGETS'),
  validatorHandler(getSalesBudgetSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;

      // Capturamos el parámetro y lo convertimos a booleano real
      const includeLines = req.query.include_lines === 'true' || req.query.includeLines === 'true';

      const record = await service.findOne(code, {
        includeLines: includeLines // Pasamos solo las líneas
      });

      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      next(error);
    }
  }
);

// Listado general (Query params validados)
router.get('/',
    checkPermission('VIEW_SALESBUDGETS'),
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

// Crear nuevo presupuesto (Cabecera + Primera línea automática)
router.post('/',
    checkPermission('CREATE_SALESBUDGETS'),
    validatorHandler(createSalesBudgetSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            const newSalesBudget = await service.create(body);
            res.status(201).json(newSalesBudget);
        } catch (error) {
            // El servicio ya lanza Boom.conflict si el código existe,
            // pero mantenemos este catch por seguridad extra de Sequelize.
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

// Actualización completa (Cabecera y Sincronización de Líneas)
router.put('/:code',
    checkPermission('UPDATE_SALESBUDGETS'),
    validatorHandler(getSalesBudgetSchema, 'params'),
    validatorHandler(updateSalesBudgetSchema, 'body'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const body = req.body;
            const record = await service.update(code, body);
            res.json(record);
        } catch (error) {
            next(error);
        }
    }
);

// Eliminación (Borrado físico con CASCADE en líneas)
router.delete('/:code',
    checkPermission('DELETE_SALESBUDGETS'),
    validatorHandler(getSalesBudgetSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            await service.delete(code);
            res.status(200).json({ code });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
