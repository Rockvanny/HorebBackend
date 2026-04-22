const express = require('express');
const passport = require('passport'); // 1. Importamos Passport
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
    passport.authenticate('jwt', { session: false }), // 2. Autenticación obligatoria
    checkPermission('allowSales'), // 3. Permiso unificado con el token
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

// Estadísticas / Contador (Ruta que suele llamar el Dashboard)
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

// Obtener una factura específica
router.get('/:code',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowSales'),
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
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(createSalesPostInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            // Usamos req.user.userId para la auditoría de quién registró la factura
            const userId = req.user.userId || req.user.sub;
            const newInvoice = await service.create(body, userId);
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
