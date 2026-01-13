const express = require('express');
const CustomerService = require('../services/customers.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createCustomerSchema, getCustomerSchema, updateCustomerSchema, queryCustomerSchema } = require('../schemas/customer.schema');

const router = express.Router();
const service = new CustomerService();

router.get('/customers-paginated', async(req, res, next) => {
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
      const { searchTerm } = req.query;
      const customers = await service.search(searchTerm);
      res.json(customers);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:code',
  validatorHandler(getCustomerSchema, 'params'),
  async (req, res, next) => {
    console.time(`Tiempo de consulta para cliente ID ${req.params.code}`);
    try {
      const { code } = req.params;

      // --- CAMBIO CLAVE AQUÍ ---
      // Leer el parámetro de consulta 'include_docs'
      // Convertirlo a booleano: 'true' o 1 se convierten en true, cualquier otra cosa en false
      const includeDocuments = req.query.include_docs === 'true' || req.query.include_docs === '1';

      // Llamar al servicio, pasando el valor booleano de includeDocuments
      const customer = await service.findOne(code, includeDocuments);
      console.timeEnd(`Tiempo de consulta para cliente ID ${code}`);
      res.json(customer);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/',
  validatorHandler(queryCustomerSchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a clientes");
    try {
      const customer = await service.find(req.query);
      console.timeEnd("Tiempo de consulta a clientes");
      res.json(customer);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  validatorHandler(createCustomerSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newCustomer = await service.create(body);
      res.status(201).json(newCustomer);
    } catch (error) {
      //Manejo explícito de errores de clave única
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `El código de cliente '${req.body.code}' ya existe. Intenta otro.`,
          error: error.errors
        });
      }
      next(error); // Otros errores seguirán su flujo normal
    }
  }
);

router.patch('/:code',
  validatorHandler(getCustomerSchema, 'params'),
  validatorHandler(updateCustomerSchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('Consulta PATCH')
      const { code } = req.params;
      const body = req.body;
      const customer = await service.update(code, body);
      res.json(customer);
    } catch (error) {
      next(error);
    }
  }
);


router.delete('/:code',
  validatorHandler(getCustomerSchema, 'params'),
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
