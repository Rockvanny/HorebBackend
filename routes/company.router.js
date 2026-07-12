const express = require('express');
const CompanyService = require('../services/company.service');
const { protectedRoute } = require('../libs/router-factory');
const {
  createCompanySchema,
  getCompanySchema,
  updateCompanySchema,
  queryCompanySchema
} = require('../schemas/company.schema');

const router = express.Router();
const service = new CompanyService();

// 1. RUTAS DE BÚSQUEDA Y PAGINACIÓN
router.get('/company-paginated',
  //...protectedRoute('VIEW_COMPANY', { query: queryCompanySchema }),
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

// 2. RUTAS BASE
router.get('/',
  //...protectedRoute('VIEW_COMPANY', { query: getCompanySchema }),
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
  //...protectedRoute('CREATE_COMPANY', { body: createCompanySchema }),
  async (req, res, next) => {
    try {
      const newCompany = await service.create(req.body);
      res.status(201).json(newCompany);
    } catch (error) {
      next(error);
    }
  }
);

// 3. RUTAS CON PARÁMETROS DINÁMICOS (:id)
router.get('/:id',
  //...protectedRoute('VIEW_COMPANY', { params: getCompanySchema }),
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
  //...protectedRoute('UPDATE_COMPANY', { params: getCompanySchema, body: updateCompanySchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const company = await service.update(id, req.body);
      res.json(company);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id',
  //...protectedRoute('DELETE_COMPANY', { params: getCompanySchema }),
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
