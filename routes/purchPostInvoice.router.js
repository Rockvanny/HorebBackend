// routes/purchPostInvoices.router.js
const express = require('express');
const passport = require('passport');
const PurchPostInvoiceService = require('../services/purchPostInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkAction } = require('../middlewares/auth.handler');
const {
  createPurchPostInvoiceSchema,
  getPurchPostInvoiceSchema,
  queryPurchPostInvoiceSchema
} = require('../schemas/purchPostInvoice.schema');

const router = express.Router();
const service = new PurchPostInvoiceService();

// Listado paginado con soporte para términos de búsqueda
router.get('/purchPostInvoices-paginated',
    passport.authenticate('jwt', { session: false }),
    //checkAction('VIEW_PURCHPOSTINVOICES'),
    async(req, res, next) => {
        try {
            const { limit, offset, searchTerm, overdue } = req.query;
            const result = await service.findPaginated({
                limit,
                offset,
                searchTerm,
                filter: overdue === 'true' ? 'overdue' : null
            });
            res.json(result);
        } catch (error) { next(error); }
    }
);

// Listado de histórico (facturas registradas)
router.get('/',
  passport.authenticate('jwt', { session: false }),
  //checkAction('VIEW_PURCHPOSTINVOICES'),
  validatorHandler(queryPurchPostInvoiceSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

router.get('/report/excel',
  passport.authenticate('jwt', { session: false }),
  //checkAction('VIEW_PURCHPOSTINVOICES'),
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;

      // Asegúrate de usar la instancia del servicio correcta
      // Si antes usabas 'service', verifica que sea el PurchPostInvoiceService
      const data = await service.findForReport(startDate, endDate);

      // La serialización JSON.parse(JSON.stringify()) sigue siendo una buena práctica
      // para limpiar objetos de Sequelize antes de enviarlos.
      return res.status(200).json(data);
    } catch (error) {
      console.error("Error en router.get /report/excel:", error);
      next(error);
    }
  }
);

// Obtener una factura específica por su CÓDIGO (Ej: FAC-2026-0001)
router.get('/:code',
  passport.authenticate('jwt', { session: false }),
  //checkAction('VIEW_PURCHPOSTINVOICES'),
  // Validamos que el parámetro 'code' cumpla con el esquema getPurchPostInvoiceSchema
  validatorHandler(getPurchPostInvoiceSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      // El servicio ahora incluye automáticamente las líneas y se expone directo como en ventas
      const invoice = await service.findOne(code, { includeLines: true });
      res.json(invoice);
    } catch (error) { next(error); }
  }
);

// Registrar una factura (Este endpoint suele ser llamado internamente por el archiveInvoice)
router.post('/',
  passport.authenticate('jwt', { session: false }),
 // checkAction('CREATE_PURCHPOSTINVOICES'),
  validatorHandler(createPurchPostInvoiceSchema, 'body'),
  async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        // Inyectamos metadatos del usuario autenticado respetando las propiedades del modelo de compras
        userName: req.user.username || req.user.email || 'system',
        userId: req.user.userId || req.user.sub
      };
      const result = await service.create(data);
      res.status(201).json(result);
    } catch (error) { next(error); }
  }
);

module.exports = router;
