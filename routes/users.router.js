const express = require('express');

const UserService = require('./../services/user.service');
const validatorHandler = require('./../middlewares/validator.handler');
// IMPORTAMOS EL MIDDLEWARE DE PERMISOS
const { checkPermission } = require('./../middlewares/auth.handler');

const {
  updateUserSchema,
  createUserSchema,
  getUserSchema,
  loginUserSchema
} = require('./../schemas/user.schema');

const router = express.Router();
const service = new UserService();

// 1. RUTAS FIJAS (Sin parámetros dinámicos)

// Para listar usuarios, requerimos permiso de gestión o settings
router.get('/',
  checkPermission('allowSettings'),
  async (req, res, next) => {
    try {
      const users = await service.find();
      res.json(users);
    } catch (error) {
      next(error);
    }
});

router.get('/roles/list', async (req, res, next) => {
  try {
    const roles = await service.getAvailableRoles();
    res.json(roles);
  } catch (error) {
    next(error);
  }
});

// --- RUTA DE LOGIN (Sin protección, es la puerta de entrada) ---
router.post('/login',
  validatorHandler(loginUserSchema, 'body'),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await service.login(email, password);
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
);

// 2. RUTAS DINÁMICAS (Con :id)

router.get('/:id',
  validatorHandler(getUserSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await service.findOne(id);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// Solo usuarios con allowSettings = true pueden CREAR nuevos usuarios
router.post('/',
  checkPermission('allowSettings'),
  validatorHandler(createUserSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      const newUser = await service.create(body);
      res.status(201).json(newUser);
    } catch (error) {
      next(error);
    }
  }
);

// Solo usuarios con allowSettings = true pueden EDITAR usuarios
router.patch('/:id',
  checkPermission('allowSettings'),
  validatorHandler(getUserSchema, 'params'),
  validatorHandler(updateUserSchema, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const body = req.body;
      const user = await service.update(id, body);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// Solo usuarios con allowSettings = true pueden ELIMINAR usuarios
router.delete('/:id',
  checkPermission('allowSettings'),
  validatorHandler(getUserSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await service.delete(id);
      res.status(201).json({ id });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
