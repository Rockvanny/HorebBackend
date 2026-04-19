const express = require('express');
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
 * 1. CONFIGURACIÓN Y METADATOS (Rutas estáticas primero)
 */

// Obtener los tipos de factura permitidos (F1, R1, etc.)
router.get('/type-invoices',
    checkPermission('VIEW_SALESINVOICES'),
    async (req, res, next) => {
        try {
            const types = await service.findTypeInvoices();
            res.json({
                success: true,
                data: types
            });
        } catch (error) {
            next(error);
        }
    }
);

// NUEVO: Obtener los tipos de rectificación (S: Sustitución, I: Diferencias)
router.get('/rectification-types',
    checkPermission('VIEW_SALESINVOICES'),
    async (req, res, next) => {
        try {
            const types = await service.findRectificationTypes();
            res.json({
                success: true,
                data: types
            });
        } catch (error) {
            next(error);
        }
    }
);

// Obtener los estados permitidos del ENUM (Abierto, Pagado)
router.get('/statuses',
    checkPermission('VIEW_SALESINVOICES'),
    async (req, res, next) => {
        try {
            const enumValues = await service.findStatuses();
            res.json({
                success: true,
                data: enumValues
            });
        } catch (error) {
            next(error);
        }
    }
);

// Contador total para estadísticas
router.get('/count',
    checkPermission('VIEW_SALESINVOICES'),
    async (req, res, next) => {
        try {
            const total = await service.countAll();
            res.status(200).json({ total });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 2. CONSULTAS DE LISTADO Y FILTRADO
 */

router.get('/salesInvoices-paginated',
    checkPermission('VIEW_SALESINVOICES'),
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

router.get('/',
    checkPermission('VIEW_SALESINVOICES'),
    validatorHandler(querySalesInvoiceSchema, 'query'),
    async (req, res, next) => {
        try {
            const records = await service.findPaginated(req.query);
            res.json(records);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 3. ACCIONES SOBRE REGISTROS ESPECÍFICOS
 */

router.get('/:code',
    checkPermission('VIEW_SALESINVOICES'),
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

router.post('/',
    checkPermission('CREATE_SALESINVOICES'),
    validatorHandler(createSalesInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            const newInvoice = await service.create(body);
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

router.post('/:code/archive',
    checkPermission('UPDATE_SALESINVOICES'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const result = await service.archiveInvoice(code);
            res.status(200).json({
                success: true,
                message: `Factura ${code} archivada correctamente como ${result.message}`,
                data: result.postInvoice
            });
        } catch (error) {
            next(error);
        }
    }
);

router.put('/:code',
    checkPermission('UPDATE_SALESINVOICES'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    validatorHandler(updateSalesInvoiceSchema, 'body'),
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

router.delete('/:code',
    checkPermission('DELETE_SALESINVOICES'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            await service.delete(code);
            res.status(200).json({
                success: true,
                code
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
