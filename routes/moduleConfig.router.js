const express = require('express');
const ModuleConfigService = require('../services/moduleConfig.service');
const { protectedRoute } = require('../libs/router-factory');
const {
  getModuleConfigSchema,
  createModuleConfigSchema,
  updateModuleConfigSchema,
  queryModuleConfigSchema
} = require('../schemas/moduleConfig.schema');

const router = express.Router();
const service = new ModuleConfigService();

router.get('/module-config-paginated',
  ...protectedRoute('VIEW_MODULECONFIG', { query: queryModuleConfigSchema }),
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
  ...protectedRoute('VIEW_MODULECONFIG', { query: queryModuleConfigSchema }),
  async (req, res, next) => {
    try {
      const modules = await service.find();
      res.json(modules);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:key',
  ...protectedRoute('VIEW_MODULECONFIG', { params: getModuleConfigSchema }),
  async (req, res, next) => {
    try {
      const { key } = req.params;
      const module = await service.findOne(key);
      res.json(module);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  ...protectedRoute('CREATE_MODULECONFIG', { body: createModuleConfigSchema }),
  async (req, res, next) => {
    try {
      const newModule = await service.create(req.body, req.user.code);
      res.status(201).json(newModule);
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/:key',
  ...protectedRoute('UPDATE_MODULECONFIG', { params: getModuleConfigSchema, body: updateModuleConfigSchema }),
  async (req, res, next) => {
    try {
      const { key } = req.params;
      const module = await service.update(key, req.body, req.user.code);
      res.json(module);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:key',
  ...protectedRoute('DELETE_MODULECONFIG', { params: getModuleConfigSchema }),
  async (req, res, next) => {
    try {
      const { key } = req.params;
      await service.delete(key);
      res.status(200).json({ key });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
