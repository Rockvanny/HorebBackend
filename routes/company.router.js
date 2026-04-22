const express = require('express');
const passport = require('passport'); // 1. Importamos passport
const CompanyService = require('../services/company.service');
const validatorHandler = require('./../middlewares/validator.handler');
const { checkPermission } = require('../middlewares/auth.handler'); // 2. Importamos el verificador de permisos
const { createCompanySchema, getCompanySchema, updateCompanySchema } = require('../schemas/company.schema');

const router = express.Router();
const service = new CompanyService();

/**
 * RUTAS DE EMPRESA PROTEGIDAS
 */

// Obtener datos de la empresa
router.get('/',
  passport.authenticate('jwt', { session: false }), // 3. Primero autenticamos
  checkPermission('allowGestion'),
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

// Crear empresa (Generalmente solo el Maestro o Admin)
router.post('/',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'), // Solo usuarios con permiso de configuración
  validatorHandler(createCompanySchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newCompany = await service.create(body);
      res.status(201).json(newCompany);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message: `El código de empresa '${req.body.code}' ya existe. Intenta otro.`,
          error: error.errors
        });
      }
      next(error);
    }
  }
);

// Actualizar datos de la empresa
router.patch('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(getCompanySchema, 'params'),
  validatorHandler(updateCompanySchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = req.body;
      const company = await service.update(id, body);
      res.json(company);
    } catch (error) {
      next(error);
    }
  }
);

// Eliminar datos de empresa
router.delete('/:id',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  validatorHandler(getCompanySchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await service.delete(id);
      res.status(200).json({ id }); // 200 es más apropiado para delete que 201
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
