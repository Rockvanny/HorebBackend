const express = require('express');
const UnitMeasureService = require('../services/unitMeasure.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createUnitMeasureSchema, updateUnitMeasureSchema, getUnitMeasureSchema, queryUnitMeasureSchema } = require('../schemas/unitMeasure.schema');

const router = express.Router();
const service = new UnitMeasureService();

router.get('/unitmeasure-paginated', async (req, res, next) => {
  try {
    const { limit, offset, searchTerm } = req.query;
    const result = await service.findPaginated({ limit, offset, searchTerm });

    res.json(result);
  } catch (error) {
    next(error);
  }
});


router.get('/:code',
  validatorHandler(getUnitMeasureSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const result = await service.findOne(code);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);


router.get('/',
  validatorHandler(queryUnitMeasureSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await service.find(req.query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/',
  validatorHandler(createUnitMeasureSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const result = await service.create(body);
      res.status(201).json(result);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `El código de unidad medida '${req.body.code}' ya existe. Intenta otro.`,
          error: error.errors
        });
      }
      next(error);
    }
  }
);

router.patch('/:code',
  validatorHandler(getUnitMeasureSchema, 'params'),
  validatorHandler(updateUnitMeasureSchema, 'body'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const body = req.body;
      const result = await service.update(code, body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:code',
  validatorHandler(getUnitMeasureSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const result = await service.delete(code);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
