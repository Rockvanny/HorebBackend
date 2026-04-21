const express = require('express');
const SalesPostInvoiceService = require('../services/salesPostInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
    getSalesPostInvoiceSchema,
    createSalesPostInvoiceSchema,
    querySalesPostInvoiceSchema
} = require('../schemas/salesPostInvoice.schema');

const router = express.Router();
const service = new SalesPostInvoiceService();

/**
 * CONSULTAS (READ-ONLY)
 */

// Listado paginado
router.get('/salesPostInvoices-paginated',
    checkPermission('VIEW_SALESPOSTINVOICES'),
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

// Estadísticas / Contador
router.get('/count',
    checkPermission('VIEW_SALESPOSTINVOICES'),
    async (req, res, next) => {
        try {
            const total = await service.countAll();
            res.status(200).json({ total });
        } catch (error) {
            next(error);
        }
    }
);

// Obtener una factura específica
router.get('/:code',
  checkPermission('VIEW_SALESPOSTINVOICES'),
  validatorHandler(getSalesPostInvoiceSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const includeLines = req.query.include_lines === 'true';

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

/**
 * ACCIONES DE REGISTRO (SOLO CREACIÓN)
 */

// Registrar factura (Acción irreversible)
router.post('/',
    checkPermission('CREATE_SALESPOSTINVOICES'),
    validatorHandler(createSalesPostInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            const newInvoice = await service.create(body);
            res.status(201).json(newInvoice);
        } catch (error) {
            if (error.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({
                    success: false,
                    message: `La factura con código '${req.body.code}' ya está registrada y no puede ser modificada.`,
                    error: error.errors
                });
            }
            next(error);
        }
    }
);

module.exports = router;
