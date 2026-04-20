const express = require('express');
const ProductsService = require('../services/products.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const { createProductSchema, updateProductSchema, getProductSchema, queryProductSchema } = require('../schemas/product.schema');

const router = express.Router();
const service = new ProductsService();

// --- RUTAS DE LECTURA ---

// Mantenemos esta ruta EXACTAMENTE igual para tu frontend
router.get('/products-paginated', async (req, res, next) => {
  try {
    const { limit, offset, searchTerm } = req.query;
    const result = await service.findPaginated({ limit, offset, searchTerm });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const { term } = req.query;
    const products = await service.search(term);
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.get('/:code',
  validatorHandler(getProductSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const product = await service.findOne(code);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/',
  validatorHandler(queryProductSchema, 'query'),
  async (req, res, next) => {
    try {
      const products = await service.find(req.query);
      res.json(products);
    } catch (error) {
      next(error);
    }
  }
);

// --- RUTAS DE ESCRITURA (CON PERMISOS) ---

router.post('/',
  checkPermission('CREATE_PRODUCTS'),
  validatorHandler(createProductSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const user = req.user?.username || 'system';
      const newProduct = await service.create(body, user);
      res.status(201).json(newProduct);
    } catch (error) {
      console.error("--- ERROR DETALLADO DE BASE DE DATOS ---");
      console.error("Mensaje:", error.message);
      if (error.parent) {
        console.error("Código DB:", error.parent.code);
        console.error("Detalle DB:", error.parent.detail);
        console.error("Query ejecutada:", error.parent.sql);
      }

      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `Conflicto de duplicidad en la base de datos.`,
          error: error.errors
        });
      }
      next(error);
    }
  }
);

router.patch('/:code',
  checkPermission('UPDATE_PRODUCTS'),
  validatorHandler(getProductSchema, 'params'),
  validatorHandler(updateProductSchema, 'body'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const body = req.body;
      const user = req.user?.username || 'system';
      const product = await service.update(code, body, user);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:code',
  checkPermission('DELETE_PRODUCTS'),
  validatorHandler(getProductSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      await service.delete(code);
      res.status(200).json({ code });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
