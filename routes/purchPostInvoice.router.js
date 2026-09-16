// routes/purchPostInvoices.router.js
const express = require('express');
const passport = require('passport');
const boom = require('@hapi/boom');
const PurchPostInvoiceService = require('../services/purchPostInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkAction } = require('../middlewares/auth.handler');
const {
  getPurchPostInvoiceSchema,
  queryPurchPostInvoiceSchema
} = require('../schemas/purchPostInvoice.schema');

const router = express.Router();
const service = new PurchPostInvoiceService();

/**
 * FACTURAS DE COMPRA REGISTRADAS — SOLO CONSULTA.
 *
 * Mismo criterio que routes/salesPostInvoice.router.js: cumplimiento AEAT,
 * una factura registrada es inmutable. Este router NUNCA debe exponer
 * creación, actualización ni borrado directos.
 *
 * La única forma legítima de que exista una fila aquí es archiveInvoice()
 * en services/purchInvoice.service.js, que llama a
 * PurchPostInvoiceService#create() DIRECTAMENTE (en proceso, no por HTTP).
 * Antes había un POST '/' aquí que exponía esa misma creación por API, sin
 * pasar por ese flujo — se quitó a propósito, no lo vuelvas a añadir.
 */

// Listado paginado con soporte para términos de búsqueda
router.get('/purchPostInvoices-paginated',
    passport.authenticate('jwt', { session: false }),
    checkAction('VIEW_PURCHPOSTINVOICES'),
    async(req, res, next) => {
        try {
            const { limit, offset, searchTerm, overdue, creditNotes, invoicesOnly } = req.query;
            const result = await service.findPaginated({
                limit,
                offset,
                searchTerm,
                // 'creditNotes': solo rectificativas (typeInvoice R1-R5) -> página "Abonos
                // de compra registrados". 'invoicesOnly': lo contrario, solo F1/F2 -> excluye
                // los abonos de "Facturas de compra registradas" para no duplicar la
                // información entre ambas páginas (ver
                // services/purchPostInvoice.service.js#findPaginated).
                filter: creditNotes === 'true' ? 'creditNotes'
                    : invoicesOnly === 'true' ? 'invoicesOnly'
                    : (overdue === 'true' ? 'overdue' : null)
            });
            res.json(result);
        } catch (error) { next(error); }
    }
);

// Listado de histórico (facturas registradas)
router.get('/',
  passport.authenticate('jwt', { session: false }),
  checkAction('VIEW_PURCHPOSTINVOICES'),
  validatorHandler(queryPurchPostInvoiceSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

/**
 * Busca facturas REGISTRADAS de un proveedor. Alimenta el selector de
 * "Factura origen" al crear una rectificativa (ver
 * services/purchPostInvoice.service.js#findByVendor): una rectificativa
 * siempre referencia una factura ya registrada, nunca un borrador.
 */
router.get('/by-vendor/:entityCode',
  passport.authenticate('jwt', { session: false }),
  checkAction('VIEW_PURCHPOSTINVOICES'),
  async (req, res, next) => {
    try {
      const { entityCode } = req.params;
      const result = await service.findByVendor(entityCode);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

router.get('/report/excel',
  passport.authenticate('jwt', { session: false }),
  checkAction('VIEW_PURCHPOSTINVOICES'),
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      const data = await service.findForReport(startDate, endDate);
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
  checkAction('VIEW_PURCHPOSTINVOICES'),
  validatorHandler(getPurchPostInvoiceSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const invoice = await service.findOne(code, { includeLines: true });
      res.json(invoice);
    } catch (error) { next(error); }
  }
);

const rejectWrite = (req, res, next) => {
  next(boom.forbidden('Las facturas de compra registradas son de solo lectura (cumplimiento AEAT): no se pueden crear, modificar ni eliminar desde esta API.'));
};

router.post('/', passport.authenticate('jwt', { session: false }), rejectWrite);
router.patch('/:code', passport.authenticate('jwt', { session: false }), rejectWrite);
router.put('/:code', passport.authenticate('jwt', { session: false }), rejectWrite);
router.delete('/:code', passport.authenticate('jwt', { session: false }), rejectWrite);

module.exports = router;
