const express = require('express');
const CustomerService = require('../services/customers.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  createCustomerSchema,
  getCustomerSchema,
  updateCustomerSchema,
  queryCustomerSchema
} = require('../schemas/customer.schema');

const router = express.Router();
const service = new CustomerService();

/**
 * GET PAGINADO (El que usa tu tabla)
 * Recuperamos el endpoint que faltaba.
 */
router.get('/customers-paginated',
  checkPermission('allowGestion'),
  validatorHandler(queryCustomerSchema, 'query'),
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

/**
 * BUSQUEDA RAPIDA
 */
router.get('/search',
  checkPermission('allowGestion'),
  async (req, res, next) => {
    try {
      const { searchTerm } = req.query;
      const customers = await service.search(searchTerm);
      res.json(customers);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * OBTENER UNO POR CODIGO
 */
router.get('/:code',
  checkPermission('allowGestion'),
  validatorHandler(getCustomerSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const includeDocuments = req.query.include_docs === 'true' || req.query.include_docs === '1';

      const customer = await service.findOne(code, includeDocuments);
      res.json(customer);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * LISTADO SIMPLE (Opcional)
 */
router.get('/',
  checkPermission('allowGestion'),
  validatorHandler(queryCustomerSchema, 'query'),
  async (req, res, next) => {
    try {
      const customers = await service.find(req.query);
      res.json(customers);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * CREAR CLIENTE
 */
router.post('/',
  checkPermission('allowGestion'),
  validatorHandler(createCustomerSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      // Pasamos userId para la auditoría
      const newCustomer = await service.create(body, req.user.userId);
      res.status(201).json(newCustomer);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `El código de cliente '${req.body.code}' ya existe.`,
          error: error.errors
        });
      }
      next(error);
    }
  }
);

/**
 * ACTUALIZAR CLIENTE
 */
router.patch('/:code',
  checkPermission('allowGestion'),
  validatorHandler(getCustomerSchema, 'params'),
  validatorHandler(updateCustomerSchema, 'body'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const body = req.body;
      const customer = await service.update(code, body, req.user.userId);
      res.json(customer);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ELIMINAR CLIENTE
 */
router.delete('/:code',
  checkPermission('allowSettings'),
  validatorHandler(getCustomerSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      await service.delete(code, req.user.userId);
      res.status(200).json({ code });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
