const express = require('express');
const VendorService = require('../services/vendors.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler');
const {
  createVendorSchema,
  getVendorSchema,
  updateVendorSchema,
  queryVendorSchema
} = require('../schemas/vendor.schema');

const router = express.Router();
const service = new VendorService();

router.get('/vendors-paginated',
  checkPermission('allowGestion'),
  validatorHandler(queryVendorSchema, 'query'),
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
  checkPermission('allowGestion'),
  async (req, res, next) => {
    try {
      const { searchTerm } = req.query; // Cambiado 'term' a 'searchTerm' para igualar Customer
      const vendors = await service.search(searchTerm);
      res.json(vendors);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:code',
  checkPermission('allowGestion'),
  validatorHandler(getVendorSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const includeDocuments = req.query.include_docs === 'true' || req.query.include_docs === '1';
      const vendor = await service.findOne(code, includeDocuments);
      res.json(vendor);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  checkPermission('allowGestion'),
  validatorHandler(createVendorSchema, 'body'),
  async (req, res, next) => {
    try {
      // Usamos el código de usuario de la sesión para auditoría
      const newVendor = await service.create(req.body, req.user.code);
      res.status(201).json(newVendor);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `El código de proveedor '${req.body.code}' ya existe.`,
          error: error.errors
        });
      }
      next(error);
    }
  }
);

router.patch('/:code',
  checkPermission('allowGestion'),
  validatorHandler(getVendorSchema, 'params'),
  validatorHandler(updateVendorSchema, 'body'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const vendor = await service.update(code, req.body, req.user.userId);
      res.json(vendor);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:code',
  checkPermission('allowSettings'),
  validatorHandler(getVendorSchema, 'params'),
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
