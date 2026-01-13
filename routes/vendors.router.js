const express = require('express');
const VendorService = require('../services/vendors.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createVendorSchema, getVendorSchema, updateVendorSchema, queryVendorSchema } = require('../schemas/vendor.schema');

const router = express.Router();
const service = new VendorService();

router.get('/vendors-paginated', async(req, res, next) => {
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
      const vendors = await service.search(term);
      res.json(vendors);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:code',
  validatorHandler(getVendorSchema, 'params'),
  async (req, res, next) => {
    console.time(`Tiempo de consulta para proveedor ID ${req.params.code}`);
    try {
      const { code } = req.params;

            // --- CAMBIO CLAVE AQUÍ ---
      // Leer el parámetro de consulta 'include_docs'
      // Convertirlo a booleano: 'true' o 1 se convierten en true, cualquier otra cosa en false
      const includeDocuments = req.query.include_docs === 'true' || req.query.include_docs === '1';

      // Llamar al servicio, pasando el valor booleano de includeDocuments
      const vendor = await service.findOne(code, includeDocuments);
      console.timeEnd(`Tiempo de consulta para proveedor ID ${code}`);
      res.json(vendor);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/',
  validatorHandler(queryVendorSchema, 'query'),
  async (req, res, next) => {
    console.time("Tiempo de consulta a clientes");
    try {
      const vendors = await service.find(req.query);
      console.timeEnd("Tiempo de consulta a clientes");
      res.json(vendors);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  validatorHandler(createVendorSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newVendor = await service.create(body);
      res.status(201).json(newVendor);
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
  validatorHandler(getVendorSchema, 'params'),
  validatorHandler(updateVendorSchema, 'body'),
  async (req, res, next) => {
    try {
      console.log('Consulta PATCH')
      const { code } = req.params;
      const body = req.body;
      const vendor = await service.update(code, body);
      res.json(vendor);
    } catch (error) {
      next(error);
    }
  }
);


router.delete('/:code',
  validatorHandler(getVendorSchema, 'params'),
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
