const express = require('express');
const passport = require('passport');
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
 * APLICAR AUTENTICACIÓN A TODAS LAS RUTAS
 * Para no repetir la línea en cada ruta, podrías usar:
 * router.use(passport.authenticate('jwt', { session: false }));
 * Pero lo pondré individualmente para mantener tu estilo actual.
 */

router.get('/customers-paginated',
  passport.authenticate('jwt', { session: false }),
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

router.get('/search',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
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

router.get('/:code',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
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

router.get('/',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
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

router.post('/',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
  checkPermission('allowGestion'),
  validatorHandler(createCustomerSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      // Ahora req.user existe gracias a Passport
      const newCustomer = await service.create(body, req.user.userId || req.user.sub);
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

router.patch('/:code',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
  checkPermission('allowGestion'),
  validatorHandler(getCustomerSchema, 'params'),
  validatorHandler(updateCustomerSchema, 'body'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const body = req.body;
      const customer = await service.update(code, body, req.user.userId || req.user.sub);
      res.json(customer);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:code',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
  checkPermission('allowGestion'),
  validatorHandler(getCustomerSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      await service.delete(code, req.user.userId || req.user.sub);
      res.status(200).json({ code });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
