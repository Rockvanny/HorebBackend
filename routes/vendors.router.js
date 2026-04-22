const express = require('express');
const passport = require('passport'); // 1. Importar Passport
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

/**
 * LISTADO PAGINADO
 */
router.get('/vendors-paginated',
  passport.authenticate('jwt', { session: false }), // 2. Autenticación obligatoria
  checkPermission('allowGestion'), // 3. Permiso unificado
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

/**
 * BÚSQUEDA RÁPIDA (Selectores)
 */
router.get('/search',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  async (req, res, next) => {
    try {
      const { searchTerm } = req.query;
      const vendors = await service.search(searchTerm);
      res.json(vendors);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DETALLE DE PROVEEDOR
 */
router.get('/:code',
  passport.authenticate('jwt', { session: false }),
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

/**
 * CREACIÓN
 */
router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(createVendorSchema, 'body'),
  async (req, res, next) => {
    try {
      // Ahora req.user.userId es accesible con seguridad para la auditoría
      const userId = req.user.userId || req.user.sub;
      const newVendor = await service.create(req.body, userId);
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

/**
 * ACTUALIZACIÓN
 */
router.patch('/:code',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(getVendorSchema, 'params'),
  validatorHandler(updateVendorSchema, 'body'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const userId = req.user.userId || req.user.sub;
      const vendor = await service.update(code, req.body, userId);
      res.json(vendor);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ELIMINACIÓN
 */
router.delete('/:code',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'), // El borrado de maestros suele limitarse a administración
  validatorHandler(getVendorSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const userId = req.user.userId || req.user.sub;
      await service.delete(code, userId);
      res.status(200).json({ code });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
