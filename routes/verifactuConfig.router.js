const express = require('express');
const VerifactuConfigService = require('../services/verifactuConfig.service');
const { protectedRoute } = require('../libs/router-factory');
const {
  getVerifactuConfigSchema,
  createVerifactuConfigSchema,
  updateVerifactuConfigSchema,
  queryVerifactuConfigSchema
} = require('../schemas/verifactuConfig.schema');

const router = express.Router();
const service = new VerifactuConfigService();

router.get('/verifactu-config-paginated',
  ...protectedRoute('VIEW_VERIFACTUCONFIG', { query: queryVerifactuConfigSchema }),
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

router.get('/',
  ...protectedRoute('VIEW_VERIFACTUCONFIG', { query: queryVerifactuConfigSchema }),
  async (req, res, next) => {
    try {
      const configs = await service.find(req.query);
      res.json(configs);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  ...protectedRoute('CREATE_VERIFACTUCONFIG', { body: createVerifactuConfigSchema }),
  async (req, res, next) => {
    try {
      const newConfig = await service.create(req.body, req.user.code);
      res.status(201).json(newConfig);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id',
  ...protectedRoute('VIEW_VERIFACTUCONFIG', { params: getVerifactuConfigSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const config = await service.findOne(id);
      res.json(config);
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/:id',
  ...protectedRoute('UPDATE_VERIFACTUCONFIG', { params: getVerifactuConfigSchema, body: updateVerifactuConfigSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const config = await service.update(id, req.body, req.user.code);
      res.json(config);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id',
  ...protectedRoute('DELETE_VERIFACTUCONFIG', { params: getVerifactuConfigSchema }),
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
