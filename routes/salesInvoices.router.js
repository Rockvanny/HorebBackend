const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const salesInvoiceService = require('../services/salesInvoices.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
    createSalesInvoiceSchema,
    getSalesInvoiceSchema,
    updateSalesInvoiceSchema,
    querySalesInvoiceSchema
} = require('../schemas/salesInvoices.schema');

const router = express.Router();
const service = new salesInvoiceService();

/**
 * CONSULTAS DE FACTURAS (VIEW)
 */

// Listado paginado con filtros
router.get('/salesInvoices-paginated',
    passport.authenticate('jwt', { session: false }), // 2. Autenticación obligatoria
    checkPermission('allowSales'), // 3. Permiso unificado
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

// Contador total para estadísticas (Dashboard)
router.get('/count',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
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

// Obtener una factura específica
router.get('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
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

/**
 * ACCIONES DE ESCRITURA
 */

// Crear nueva factura
router.post('/',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(createSalesInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            const userId = req.user.userId || req.user.sub;
            const newInvoice = await service.create(body, userId);
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

// Archivar factura (Acción irreversible que genera una SalesPostInvoice)
router.post('/:code/archive',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const userId = req.user.userId || req.user.sub;
            const result = await service.archiveInvoice(code, userId); // Pasamos userId para la auditoría
            res.status(200).json({
                success: true,
                message: `Factura ${code} archivada correctamente`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

// Actualización completa
router.put('/:code',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSales'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    validatorHandler(updateSalesInvoiceSchema, 'body'),
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
    checkPermission('allowSettings'), // Borrar facturas suele ser restringido
    validatorHandler(getSalesInvoiceSchema, 'params'),
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
