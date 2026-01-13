const express = require('express');
const CompanyService = require('../services/company.service');
const validatorHandler = require('./../middlewares/validator.handler');
const {createCompanySchema, getCompanySchema, updateCompanySchema} = require('../schemas/company.schema');

const router = express.Router();
const service = new CompanyService();


router.get('/',
  validatorHandler(getCompanySchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a empresa");
    try {
      const company = await service.find(req.query);
      console.timeEnd("Tiempo de consulta a empresa");
      res.json(company);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  validatorHandler(createCompanySchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newComapny = await service.create(body);
      res.status(201).json(newComapny);
    } catch (error) {
      //Manejo explícito de errores de clave única
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `El código de empresa '${req.body.code}' ya existe. Intenta otro.`,
          error: error.errors
        });
      }
      next(error); // Otros errores seguirán su flujo normal
    }
  }
);

router.patch('/:id',
  validatorHandler(getCompanySchema, 'params'),
  validatorHandler(updateCompanySchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('Consulta PATCH')
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
  validatorHandler(getCompanySchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await service.delete(id);
      res.status(201).json({ id });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
