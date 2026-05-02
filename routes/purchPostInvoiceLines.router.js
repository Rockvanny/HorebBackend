const express = require('express');
const passport = require('passport');
const PurchPostInvoiceLineService = require('../services/purchPostInvoiceLines.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  getPurchPostInvoiceLineSchema,
  queryPurchPostInvoiceLineSchema
} = require('../schemas/purchPostInvoiceLine.schema');

const router = express.Router();
const service = new PurchPostInvoiceLineService();

/**
 * CONSULTAS (READ-ONLY) - LÍNEAS DE COMPRAS REGISTRADAS
 */

// Consulta paginada general (Útil para reportes de gastos por artículo)
router.get('/paginated',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'),
  validatorHandler(queryPurchPostInvoiceLineSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

// Obtener por ID técnico (id autoincremental de la tabla)
router.get('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowPurchases'),
  validatorHandler(getPurchPostInvoiceLineSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const line = await service.findOneById(id);
      res.json(line);
    } catch (error) { next(error); }
  }
);

/**
 * NOTA: No se incluyen rutas POST, PATCH o DELETE.
 * Las líneas se crean masivamente desde el servicio de la cabecera (PurchPostInvoiceService)
 * al contabilizar la factura, garantizando la integridad del documento.
 */

module.exports = router;
