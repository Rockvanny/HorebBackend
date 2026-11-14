const express = require('express');
const passport = require('passport');
const TaxRatesService = require('../services/taxRates.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkRole } = require('../middlewares/auth.handler');
const { createTaxRateSchema, updateTaxRateSchema, getTaxRateSchema } = require('../schemas/taxRate.schema');

const router = express.Router();
const service = new TaxRatesService();

const authenticated = passport.authenticate('jwt', { session: false });

/**
 * Tipos activos para los desplegables de impuesto y retención de líneas y
 * productos: cualquier usuario del escritorio. Sustituye a
 * /enums/<modelo>/taxType.
 */
router.get('/options',
  authenticated,
  async (req, res, next) => {
    try {
      res.json({ success: true, data: await service.options() });
    } catch (error) { next(error); }
  }
);

/**
 * Mantenimiento (Configuración › Impuestos): admin y financiero, como el
 * resto de Configuración que ve financiero (ver access-manager.js).
 */
const canManage = [authenticated, checkRole('admin', 'financiero')];

router.get('/tax-rates-paginated',
  ...canManage,
  async (req, res, next) => {
    try {
      const { limit, offset, searchTerm } = req.query;
      res.json(await service.findPaginated({ limit, offset, searchTerm }));
    } catch (error) { next(error); }
  }
);

router.get('/:id',
  ...canManage,
  validatorHandler(getTaxRateSchema, 'params'),
  async (req, res, next) => {
    try {
      res.json({ success: true, data: await service.findOne(req.params.id) });
    } catch (error) { next(error); }
  }
);

router.post('/',
  ...canManage,
  validatorHandler(createTaxRateSchema, 'body'),
  async (req, res, next) => {
    try {
      res.status(201).json({ success: true, data: await service.create(req.body) });
    } catch (error) { next(error); }
  }
);

router.patch('/:id',
  ...canManage,
  validatorHandler(getTaxRateSchema, 'params'),
  validatorHandler(updateTaxRateSchema, 'body'),
  async (req, res, next) => {
    try {
      res.json({ success: true, data: await service.update(req.params.id, req.body) });
    } catch (error) { next(error); }
  }
);

router.delete('/:id',
  ...canManage,
  validatorHandler(getTaxRateSchema, 'params'),
  async (req, res, next) => {
    try {
      res.json({ success: true, data: await service.delete(req.params.id) });
    } catch (error) { next(error); }
  }
);

module.exports = router;
