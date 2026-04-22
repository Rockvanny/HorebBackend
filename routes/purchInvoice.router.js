const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const PurchInvoiceService = require('../services/purchInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
    createPurchInvoiceSchema,
    getPurchInvoiceSchema,
    updatePurchInvoiceSchema,
    queryPurchInvoiceSchema
} = require('../schemas/purchInvoice.schema');

const router = express.Router();
const service = new PurchInvoiceService();

/**
 * CONSULTAS DE FACTURAS DE COMPRA (VIEW)
 */

// Listado paginado con filtros
router.get('/purchInvoices-paginated',
    passport.authenticate('jwt', { session: false }), // 2. Inyectar Passport antes del permiso
    checkPermission('allowPurchases'), // 3. Usar el nombre de permiso del UserService
    async(req, res, next) => {
        try {
            const { limit, offset, searchTerm, overdue } = req.query;
            const filter = overdue === 'true' ? 'overdue' : null;

            const result = await service.findPaginated({
              limit,
              offset,
              searchTerm,
              filter
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// Contador total para estadísticas rápidos
router.get('/count',
    passport.authenticate('jwt', { session: false }), // <--- CRÍTICO para el Dashboard
    checkPermission('allowPurchases'),
    async (req, res, next) => {
        try {
            const { filter, overdue } = req.query;
            const activeFilter = overdue === 'true' ? 'overdue' : filter;

            const total = await service.countAll({ filter: activeFilter });
            res.status(200).json({ total });
        } catch (error) {
            next(error);
        }
    }
);

// Obtener una factura específica por código
router.get('/:code',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'),
  validatorHandler(getPurchInvoiceSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const includeLines = req.query.include_lines === 'true' || req.query.includeLines === 'true';

      const record = await service.findOne(code, {
        includeLines: includeLines
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

// Listado general
router.get('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(queryPurchInvoiceSchema, 'query'),
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

// Crear nueva factura
router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(createPurchInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            // Opcional: pasar req.user.userId al create para auditoría
            const newInvoice = await service.create(body, req.user.userId);
            res.status(201).json(newInvoice);
        } catch (error) {
            if (error.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({
                    success: false,
                    message: `El código de factura '${req.body.code}' ya existe en el sistema.`,
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
    checkPermission('allowPurchases'),
    validatorHandler(getPurchInvoiceSchema, 'params'),
    validatorHandler(updatePurchInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const body = req.body;
            const record = await service.update(code, body, req.user.userId);
            res.json(record);
        } catch (error) {
            next(error);
        }
    }
);

// Eliminación
router.delete('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowGestion'), // Normalmente borrar facturas requiere permisos de admin/settings
    validatorHandler(getPurchInvoiceSchema, 'params'),
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
