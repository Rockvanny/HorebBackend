const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const UserService = require('./../services/user.service');
const validatorHandler = require('./../middlewares/validator.handler');

// Lógica de acceso
const { ROLES_LIST, checkPermission: validateAction } = require('../config/access-manager');
const { checkPermission } = require('../middlewares/auth.handler');
const { updateUserSchema, createUserSchema, getUserSchema, loginUserSchema } = require('./../schemas/user.schema');

const router = express.Router();
const service = new UserService();

// --- NUEVOS ENDPOINTS DE CONFIGURACIÓN Y ACCESO ---

// 1. Obtener lista de roles
router.get('/roles/list',
    passport.authenticate('jwt', { session: false }), // Protegido: solo usuarios logueados ven roles
    (req, res) => {
        res.json({ success: true, data: ROLES_LIST });
    }
);

// 2. Validación masiva de permisos (Para syncUI en el frontend)
router.post('/permissions/check',
    passport.authenticate('jwt', { session: false }), // Obligatorio para tener req.user
    async (req, res, next) => {
        try {
            const { permissions } = req.body;

            // req.user ya viene inyectado por Passport
            const userRole = req.user?.role;
            const userModules = {
                allowSales: req.user?.allowSales,
                allowPurchases: req.user?.allowPurchases,
                allowGestion: req.user?.allowGestion,
                allowSettings: req.user?.allowSettings,
            };

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
    }
);

// --- ENDPOINTS DE USUARIOS ---

// 1. LISTADO PAGINADO
router.get('/users-paginated',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSettings'), // Solo administradores gestionan usuarios
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

// 2. LOGIN (¡DEBE SER ABIERTO!)
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

// 3. CRUD OPERACIONES
router.get('/:id',
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSettings'),
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
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSettings'),
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
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSettings'),
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
    passport.authenticate('jwt', { session: false }),
    checkPermission('allowSettings'),
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
