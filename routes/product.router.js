const express = require('express');
const ProductsService = require('../services/products.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createProductSchema, updateProductSchema, getProductSchema, queryProductSchema } = require('../schemas/product.schema');

const router = express.Router();
const service = new ProductsService();

router.get('/products-paginated', async(req, res, next) => {
  try {
    const { limit, offset, searchTerm } = req.query;
    const result = await service.findPaginated({ limit, offset, searchTerm });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/search',
  // validatorHandler(queryProductSchema, 'query'), // Si tienes esquema para el query param
  async (req, res, next) => {
    try {
      const { term } = req.query;
      const products = await service.search(term);
      res.json(products);
    } catch (error) {
      next(error);
    }
  }
);


router.get('/:code',
  validatorHandler(getProductSchema, 'params'),
  async (req, res, next) => {
    console.time(`Tiempo de consulta para producto ID ${req.params.code}`);
    try {
      const { code } = req.params;
      const product = await service.findOne(code);
      console.timeEnd(`Tiempo de consulta para producto ID ${code}`);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
);


router.get('/',
  validatorHandler(queryProductSchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a productos");
    try {
      const products = await service.find(req.query);
      console.timeEnd("Tiempo de consulta a productos");
      res.json(products);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  validatorHandler(createProductSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newProduct = await service.create(body);
      res.status(201).json(newProduct);
    } catch (error) {
      //Manejo explícito de errores de clave única
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `El código de producto '${req.body.code}' ya existe. Intenta otro.`,
          error: error.errors
        });
      }
      next(error); // Otros errores seguirán su flujo normal
    }
  }
);


router.patch('/:code',
  validatorHandler(getProductSchema, 'params'),
  validatorHandler(updateProductSchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('Consulta PATCH')
      const { code } = req.params;
      const body = req.body;
      const product = await service.update(code, body);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:code',
  validatorHandler(getProductSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      await service.delete(code);
      res.status(201).json({ code });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
