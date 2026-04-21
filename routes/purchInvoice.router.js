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
 * CONSULTAS DE FACTURAS DE COMPRA (VIEW)
 */

// Listado paginado con filtros
router.get('/purchInvoices-paginated',
    checkPermission('VIEW_PURCHINVOICES'),
    async(req, res, next) => {
        try {
            const { limit, offset, searchTerm, overdue } = req.query;

            // Si 'overdue' viene como 'true' (string), asignamos 'overdue' a la variable filter
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
    checkPermission('VIEW_PURCHINVOICES'),
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

// Obtener una factura específica por código (con inclusiones opcionales)
router.get('/:code',
  checkPermission('VIEW_PURCHINVOICES'),
  validatorHandler(getPurchInvoiceSchema, 'params'),
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
    checkPermission('VIEW_PURCHINVOICES'),
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

// Crear nueva factura de compra (Cabecera + Líneas)
router.post('/',
    checkPermission('CREATE_PURCHINVOICES'),
    validatorHandler(createPurchInvoiceSchema, 'body'),
    async (req, res, next) => {
        try {
            const body = req.body;
            const newInvoice = await service.create(body);
            res.status(201).json(newInvoice);
        } catch (error) {
            // Sincronizado con la lógica de error de ofertas
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

// Actualización completa (Cabecera y Sincronización de Líneas)
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

// Eliminación (Borrado físico con CASCADE en líneas)
router.delete('/:code',
    checkPermission('DELETE_PURCHINVOICES'),
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
