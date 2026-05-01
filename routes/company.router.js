const express = require('express');
const passport = require('passport');
const CompanyService = require('../services/company.service');
const validatorHandler = require('./../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const { createCompanySchema, getCompanySchema, updateCompanySchema, queryCompanySchema } = require('../schemas/company.schema');

const router = express.Router();
const service = new CompanyService();

// 1. RUTAS DE BÚSQUEDA Y PAGINACIÓN (Siempre antes que :id)
router.get('/company-paginated',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(queryCompanySchema, 'query'),
  async (req, res, next) => {
    try {
      const { limit, offset, searchTerm } = req.query;
      const result = await service.findPaginated({ limit, offset, searchTerm });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// 2. RUTAS BASE (GET / POST / etc.)
router.get('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  // Eliminamos o relajamos el validador aquí si quieres que el logo cargue sin enviar parámetros
  validatorHandler(getCompanySchema, 'query'),
  async (req, res, next) => {
    try {
      const company = await service.find(req.query);
      res.json(company);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(createCompanySchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newCompany = await service.create(body);
      res.status(201).json(newCompany);
    } catch (error) {
      next(error);
    }
  }
);

// 3. RUTAS CON PARÁMETROS DINÁMICOS (:id) - Siempre al final
router.get('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(getCompanySchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const company = await service.findOne(id);
      res.json(company);
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(getCompanySchema, 'params'),
  validatorHandler(updateCompanySchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = req.body;
      const company = await service.update(id, body);
      res.json(company);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(getCompanySchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await service.delete(id);
      res.status(200).json({ id });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
