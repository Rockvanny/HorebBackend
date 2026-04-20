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
 * CONSULTAS DE FACTURAS (VIEW)
 */

// Listado paginado con filtros (Espejo de Budget)
router.get('/salesInvoices-paginated',
    checkPermission('VIEW_SALESINVOICES'),
    async(req, res, next) => {
        try {
            // CAMBIO AQUÍ: Capturamos 'overdue' de req.query
            const { limit, offset, searchTerm, overdue } = req.query;

            // Si 'overdue' viene como 'true' (string), asignamos 'overdue' a la variable filter
            const filter = overdue === 'true' ? 'overdue' : null;

            const result = await service.findPaginated({
                limit,
                offset,
                searchTerm,
                filter // Ahora sí, filter ya no será undefined
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// Contador total para estadísticas (Espejo de Budget)
router.get('/count',
    checkPermission('VIEW_SALESINVOICES'),
    async (req, res, next) => {
        try {
            // 1. Capturamos tanto 'filter' como 'overdue' por si acaso
            const { filter, overdue } = req.query;

            // 2. Normalizamos: Si viene overdue=true, asignamos 'overdue'
            // Esto asegura que el service.countAll reciba el string correcto
            const activeFilter = overdue === 'true' ? 'overdue' : filter;

            const total = await service.countAll({ filter: activeFilter });

            res.status(200).json({ total });
        } catch (error) {
            next(error);
        }
    }
);

// Obtener una factura específica por código (Espejo de Budget)
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

// Listado general (Espejo de Budget)
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
 * ACCIONES DE ESCRITURA
 */

// Crear nueva factura (Espejo de Budget)
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

// Archivar factura (Específico de Invoice)
router.post('/:code/archive',
    checkPermission('UPDATE_SALESINVOICES'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
    async (req, res, next) => {
        try {
            const { code } = req.params;
            const result = await service.archiveInvoice(code);
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

// Actualización completa (Espejo de Budget)
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

// Eliminación (Espejo de Budget)
router.delete('/:code',
    checkPermission('DELETE_SALESINVOICES'),
    validatorHandler(getSalesInvoiceSchema, 'params'),
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
