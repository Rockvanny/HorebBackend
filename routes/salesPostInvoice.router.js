const express = require('express');
const passport = require('passport');
const boom = require('@hapi/boom');
const SalesPostInvoiceService = require('../services/salesPostInvoice.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkAction } = require('../middlewares/auth.handler');
const {
  getSalesPostInvoiceSchema,
  querySalesPostInvoiceSchema
} = require('../schemas/salesPostInvoice.schema');

const router = express.Router();
const service = new SalesPostInvoiceService();

/**
 * FACTURAS DE VENTA REGISTRADAS — SOLO CONSULTA.
 *
 * Cumplimiento AEAT/Veri*factu: una vez registrada, una factura es
 * inmutable (encadenamiento de huella, ver libs/hasInvoice.js). Este
 * router NUNCA debe exponer creación, actualización ni borrado directos.
 *
 * La única forma legítima de que exista una fila aquí es archiveInvoice()
 * en services/salesInvoices.service.js, que llama a
 * SalesPostInvoiceService#create() DIRECTAMENTE (en proceso, no por HTTP)
 * como parte del flujo factura borrador -> factura registrada. Antes había
 * un POST '/' aquí que exponía esa misma creación por API, sin pasar por
 * ese flujo ni por sus reglas de negocio — se quitó a propósito, no lo
 * vuelvas a añadir.
 *
 * Los DELETE/PATCH/PUT de abajo son un cierre explícito (no basta con "no
 * definir la ruta": así queda documentado y cualquiera que intente
 * añadirlos por error lo ve escrito).
 */

router.get('/salesPostInvoices-paginated',
    passport.authenticate('jwt', { session: false }),
    checkAction('VIEW_SALESPOSTINVOICES'),
    async(req, res, next) => {
        try {
            const { limit, offset, searchTerm, overdue, creditNotes, invoicesOnly } = req.query;
            const result = await service.findPaginated({
                limit,
                offset,
                searchTerm,
                // 'creditNotes': solo rectificativas (typeInvoice R1-R5) -> página "Abonos
                // de venta registrados". 'invoicesOnly': lo contrario, solo F1/F2 -> excluye
                // los abonos de "Facturas de venta registradas" para no duplicar la
                // información entre ambas páginas (ver
                // services/salesPostInvoice.service.js#findPaginated).
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
  checkAction('VIEW_SALESPOSTINVOICES'),
  validatorHandler(querySalesPostInvoiceSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

/**
 * Busca facturas REGISTRADAS de un cliente. Alimenta el selector de
 * "Factura origen" al crear una rectificativa (ver
 * services/salesPostInvoice.service.js#findByCustomer): una rectificativa
 * siempre referencia una factura ya registrada, nunca un borrador.
 */
router.get('/by-customer/:entityCode',
  passport.authenticate('jwt', { session: false }),
  checkAction('VIEW_SALESPOSTINVOICES'),
  async (req, res, next) => {
    try {
      const { entityCode } = req.params;
      const result = await service.findByCustomer(entityCode);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

// Obtener una factura específica por su CÓDIGO (Ej: FAC-2026-0001)
router.get('/:code',
  passport.authenticate('jwt', { session: false }),
  checkAction('VIEW_SALESPOSTINVOICES'),
  validatorHandler(getSalesPostInvoiceSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      // El servicio ahora incluye automáticamente los taxes gracias al movementId
      const invoice = await service.findOne(code, { includeLines: true });
      res.json(invoice);
    } catch (error) { next(error); }
  }
);

const rejectWrite = (req, res, next) => {
  next(boom.forbidden('Las facturas de venta registradas son de solo lectura (cumplimiento AEAT): no se pueden crear, modificar ni eliminar desde esta API.'));
};

router.post('/', passport.authenticate('jwt', { session: false }), rejectWrite);
router.patch('/:code', passport.authenticate('jwt', { session: false }), rejectWrite);
router.put('/:code', passport.authenticate('jwt', { session: false }), rejectWrite);
router.delete('/:code', passport.authenticate('jwt', { session: false }), rejectWrite);

module.exports = router;
