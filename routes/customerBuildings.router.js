const express = require('express');
const passport = require('passport');
const CustomerBuildingsService = require('../services/customerBuildings.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkRole } = require('../middlewares/auth.handler');
const {
  createCustomerBuildingSchema,
  updateCustomerBuildingSchema,
  getCustomerBuildingSchema,
  queryCustomerBuildingSchema
} = require('../schemas/customerBuilding.schema');

const router = express.Router();
const service = new CustomerBuildingsService();

/**
 * "Mis edificios" para la app móvil (customer-jwt, NUNCA 'jwt' de empleado):
 * solo lectura, solo los del propio cliente autenticado -para el selector al
 * reportar una incidencia, ver incidentReports.router.js-. Va ANTES de
 * '/:id' a propósito, si no Express interpretaría "mine" como el :id de las
 * rutas de admin de abajo.
 */
router.get('/mine',
  passport.authenticate('customer-jwt', { session: false }),
  async (req, res, next) => {
    try {
      const buildings = await service.findMine(req.user.code);
      res.json({ success: true, data: buildings });
    } catch (error) { next(error); }
  }
);

// A partir de aquí, gestión del vínculo cliente-edificio: exclusiva de admin
// (checkRole, decidido con el usuario 2026-09-19 -alta solo desde
// escritorio/backend-).

router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkRole('admin'),
  validatorHandler(createCustomerBuildingSchema, 'body'),
  async (req, res, next) => {
    try {
      const link = await service.create(req.body);
      res.status(201).json({ success: true, data: link });
    } catch (error) { next(error); }
  }
);

router.get('/',
  passport.authenticate('jwt', { session: false }),
  checkRole('admin'),
  validatorHandler(queryCustomerBuildingSchema, 'query'),
  async (req, res, next) => {
    try {
      const links = await service.find(req.query);
      res.json({ success: true, data: links });
    } catch (error) { next(error); }
  }
);

router.patch('/:id',
  passport.authenticate('jwt', { session: false }),
  checkRole('admin'),
  validatorHandler(getCustomerBuildingSchema, 'params'),
  validatorHandler(updateCustomerBuildingSchema, 'body'),
  async (req, res, next) => {
    try {
      const link = await service.update(req.params.id, req.body);
      res.json({ success: true, data: link });
    } catch (error) { next(error); }
  }
);

router.delete('/:id',
  passport.authenticate('jwt', { session: false }),
  checkRole('admin'),
  validatorHandler(getCustomerBuildingSchema, 'params'),
  async (req, res, next) => {
    try {
      const result = await service.delete(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

module.exports = router;
