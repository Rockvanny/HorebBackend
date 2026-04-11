const express = require('express');
const UserService = require('./../services/user.service');
const validatorHandler = require('./../middlewares/validator.handler');

// Importamos la lógica centralizada de acceso
const { ROLES_LIST, checkPermission: validateAction } = require('../config/access-manager');
const { updateUserSchema, createUserSchema, getUserSchema, loginUserSchema } = require('./../schemas/user.schema');

const router = express.Router();
const service = new UserService();

// --- NUEVOS ENDPOINTS DE CONFIGURACIÓN Y ACCESO ---

// 1. Obtener lista de roles (Para el select del formulario)
router.get('/roles/list', (req, res) => {
  console.log("Roles detectados:", ROLES_LIST);
    res.json({ success: true, data: ROLES_LIST });
});

// 2. Validación masiva de permisos (Para syncUI en el frontend)
router.post('/permissions/check', async (req, res, next) => {
    try {
        const { permissions } = req.body; // Array de strings: ["CREATE_USERS", "VIEW_SALES"...]

        // Asumimos que la sesión del usuario está en req.user (inyectada por tu middleware de auth)
        const userRole = req.user?.role;
        const userModules = req.user?.modules || {};

        const results = {};
        if (Array.isArray(permissions)) {
            permissions.forEach(p => {
                results[p] = validateAction(userRole, userModules, p);
            });
        }

        res.json({ success: true, data: results });
    } catch (error) {
        next(error);
    }
});

// --- ENDPOINTS EXISTENTES AJUSTADOS ---

// 1. LISTADO PAGINADO
router.get('/users-paginated',
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

// 2. BÚSQUEDA RÁPIDA
router.get('/search',
    async (req, res, next) => {
        try {
            const { searchTerm } = req.query;
            const users = await service.search(searchTerm);
            res.json(users);
        } catch (error) {
            next(error);
        }
    }
);

// 3. LOGIN
router.post('/login',
    validatorHandler(loginUserSchema, 'body'),
    async (req, res, next) => {
        try {
            const result = await service.login(req.body.email, req.body.password);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
);

// 4. CRUD OPERACIONES
router.get('/:id',
    validatorHandler(getUserSchema, 'params'),
    async (req, res, next) => {
        try {
            const user = await service.findOne(req.params.id);
            res.json(user);
        } catch (error) {
            next(error);
        }
    }
);

router.post('/',
    // Aquí podrías usar una validación directa: validateAction(req.user.role, req.user.modules, 'CREATE_USERS')
    validatorHandler(createUserSchema, 'body'),
    async (req, res, next) => {
        try {
            const newUser = await service.create(req.body);
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
            const user = await service.update(id, req.body);
            res.json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }
);

router.delete('/:id',
    validatorHandler(getUserSchema, 'params'),
    async (req, res, next) => {
        try {
            await service.delete(req.params.id);
            res.status(201).json({ id: req.params.id });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
