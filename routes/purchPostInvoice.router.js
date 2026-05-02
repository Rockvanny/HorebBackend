const express = require('express');
const passport = require('passport');
const PurchPostInvoiceService = require('../services/purchPostInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  createPurchPostInvoiceSchema,
  getPurchPostInvoiceSchema,
  queryPurchPostInvoiceSchema
} = require('../schemas/purchPostInvoice.schema');

const router = express.Router();
const service = new PurchPostInvoiceService();

/**
 * CONSULTAS (READ-ONLY) - HISTÓRICO DE COMPRAS
 */

// Listado paginado y filtrado (Efecto Espejo con Ventas)
router.get('/purchPostInvoices-paginated',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(queryPurchPostInvoiceSchema, 'query'),
    async (req, res, next) => {
        try {
            const { limit, offset, searchTerm, overdue } = req.query;
            const result = await service.findPaginated({
                limit,
                offset,
                searchTerm,
                // Filtro para facturas vencidas (overdue) igual que en ventas
                filter: overdue === 'true' ? 'overdue' : null
            });
            res.json(result);
        } catch (error) { next(error); }
    }
);

// Estadísticas para Dashboard de Compras
router.get('/count',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    async (req, res, next) => {
        try {
            const total = await service.countAll();
            res.status(200).json({ total });
        } catch (error) { next(error); }
    }
);

// Obtener una factura registrada por su ID o CÓDIGO
// (Usamos ID para consistencia con el resto de la API, pero soportamos includeLines)
router.get('/:id',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(getPurchPostInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const includeLines = req.query.include_lines === 'true';

            const invoice = await service.findOne(id, { includeLines });
            res.json({
                success: true,
                data: invoice
            });
        } catch (error) { next(error); }
    }
);

/**
 * ACCIONES DE REGISTRO (INMUTABLES)
 */

// Registrar factura de compra (Paso de borrador a histórico)
router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowPurchases'),
    validatorHandler(createPurchPostInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const userId = req.user.userId || req.user.sub;
            const userName = req.user.username || req.user.email || 'system';

            const data = {
                ...req.body,
                userName: userName // Mapeo al campo del modelo
            };

            const newPostInvoice = await service.create(data, userId);
            res.status(201).json(newPostInvoice);
        } catch (error) {
            // Manejo de conflicto por si la factura ya fue registrada
            if (error.name === "SequelizeUniqueConstraintError") {
                return res.status(409).json({
                    success: false,
                    message: `La factura '${req.body.code}' ya consta en el histórico y no puede duplicarse.`,
                    error: error.errors
                });
            }
            next(error);
        }
    }
);

module.exports = router;
