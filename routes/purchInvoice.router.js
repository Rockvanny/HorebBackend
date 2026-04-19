const express = require('express');
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
 * CONSULTAS DE CONFIGURACIÓN Y METADATOS
 */

// Obtener los estados permitidos y categorías
router.get('/statuses',
    checkPermission('VIEW_PURCHINVOICES'),
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

/**
 * CONSULTAS DE FACTURAS DE COMPRA (VIEW)
 */

// Listado paginado con filtros
router.get('/purchInvoices-paginated',
    checkPermission('VIEW_PURCHINVOICES'),
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
    checkPermission('VIEW_PURCHINVOICES'),
    async (req, res, next) => {
        try {
            const total = await service.countAll();
            res.status(200).json({ total });
        } catch (error) {
            next(error);
        }
    }
);

// Obtener una factura específica por código
router.get('/:code',
    checkPermission('VIEW_PURCHINVOICES'),
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

// Listado general (Query params validados)
router.get('/',
    checkPermission('VIEW_PURCHINVOICES'),
    validatorHandler(queryPurchInvoiceSchema, 'query'),
    async (req, res, next) => {
        try {
            const records = await service.find(req.query);
            res.json(records);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * ACCIONES DE ESCRITURA Y PROCESADO
 */

// Crear nueva factura de compra
router.post('/',
    checkPermission('CREATE_PURCHINVOICES'),
    validatorHandler(createPurchInvoiceSchema, 'body'),
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

// Archivar factura de compra (Pasar a histórico)
router.post('/:code/archive',
    checkPermission('UPDATE_PURCHINVOICES'),
    validatorHandler(getPurchInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const result = await service.archiveInvoice(code);
            res.status(200).json({
                success: true,
                message: `Factura de compra archivada correctamente`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

// Actualización de factura de compra
router.put('/:code',
    checkPermission('UPDATE_PURCHINVOICES'),
    validatorHandler(getPurchInvoiceSchema, 'params'),
    validatorHandler(updatePurchInvoiceSchema, 'body'),
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

// Eliminación (Borrado físico con CASCADE)
router.delete('/:code',
    checkPermission('DELETE_PURCHINVOICES'),
    validatorHandler(getPurchInvoiceSchema, 'params'),
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
