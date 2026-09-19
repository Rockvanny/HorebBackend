const express = require('express');
const passport = require('passport');
const BuildingsService = require('../services/buildings.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkRole } = require('../middlewares/auth.handler');
const {
  createBuildingSchema,
  updateBuildingSchema,
  getBuildingSchema,
  queryBuildingSchema
} = require('../schemas/building.schema');

const router = express.Router();
const service = new BuildingsService();

// CRUD de edificios: exclusivo de admin (checkRole, decidido con el usuario
// 2026-09-19 -alta/gestión solo desde escritorio/backend, nunca desde el
// móvil-). No basta checkAction: financiero/vendedor también podrían tener
// algún módulo activo que no debería darles acceso a esto.
router.use(passport.authenticate('jwt', { session: false }), checkRole('admin'));

router.post('/',
  validatorHandler(createBuildingSchema, 'body'),
  async (req, res, next) => {
    try {
      const building = await service.create(req.body);
      res.status(201).json({ success: true, data: building });
    } catch (error) { next(error); }
  }
);

router.get('/',
  validatorHandler(queryBuildingSchema, 'query'),
  async (req, res, next) => {
    try {
      const buildings = await service.find(req.query);
      res.json({ success: true, data: buildings });
    } catch (error) { next(error); }
  }
);

// listPage del Frontend (ver document-schema.mjs#buildings): misma forma de
// respuesta que customers-paginated -sin envolver en {success,data}-, porque
// explorer.js#fetchPaginatedData lee records/hasMore directamente del body.
router.get('/buildings-paginated',
  validatorHandler(queryBuildingSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.findPaginated(req.query);
      res.json(result);
    } catch (error) { next(error); }
  }
);

router.get('/:id',
  validatorHandler(getBuildingSchema, 'params'),
  async (req, res, next) => {
    try {
      const building = await service.findOne(req.params.id);
      res.json({ success: true, data: building });
    } catch (error) { next(error); }
  }
);

router.patch('/:id',
  validatorHandler(getBuildingSchema, 'params'),
  validatorHandler(updateBuildingSchema, 'body'),
  async (req, res, next) => {
    try {
      const building = await service.update(req.params.id, req.body);
      res.json({ success: true, data: building });
    } catch (error) { next(error); }
  }
);

router.delete('/:id',
  validatorHandler(getBuildingSchema, 'params'),
  async (req, res, next) => {
    try {
      const result = await service.delete(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

module.exports = router;
