const express = require('express');

const UserService = require('./../services/user.service');
const validatorHandler = require('./../middlewares/validator.handler');
// Importamos el nuevo esquema de login
const {
  updateUserSchema,
  createUserSchema,
  getUserSchema,
  loginUserSchema
} = require('./../schemas/user.schema');

const router = express.Router();
const service = new UserService();

// 1. RUTAS FIJAS (Sin parámetros dinámicos)
router.get('/', async (req, res, next) => {
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

// --- RUTA DE LOGIN ---
// Se coloca aquí para que Express no la confunda con un ID de usuario
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

router.post('/',
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

router.patch('/:id',
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

router.delete('/:id',
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
