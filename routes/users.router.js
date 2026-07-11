const express = require('express');
const passport = require('passport');
const UserService = require('./../services/user.service');
const validatorHandler = require('./../middlewares/validator.handler');

// NUEVA IMPORTACIÓN: Motor central de acceso y middleware de acciones
const { checkAction: validateAction } = require('../config/access-manager');
const { checkAction } = require('../middlewares/auth.handler');
const { updateUserSchema, createUserSchema, getUserSchema, loginUserSchema } = require('./../schemas/user.schema');

const router = express.Router();
const service = new UserService();

// --- ENDPOINTS DE CONFIGURACIÓN Y ACCESO ---

// 1. Obtener lista de roles (Protegido)
router.get('/roles/list',
    passport.authenticate('jwt', { session: false }),
    (req, res) => {
        res.json({ success: true, data: Object.keys(require('../config/access-manager').ROLES) });
    }
);

// 2. Validación masiva de permisos (Para sincronización del Frontend)
router.post('/permissions/check',
    passport.authenticate('jwt', { session: false }),
    async (req, res, next) => {
        try {
            const { permissions } = req.body; // Array de acciones (ej: ['DELETE_USERS', 'PRINT_VENTAS'])
            const results = {};

            if (Array.isArray(permissions)) {
                permissions.forEach(p => {
                    results[p] = validateAction(req.user, p);
                });
            }
            res.json({ success: true, data: results });
        } catch (error) {
            next(error);
        }
    }
);

// --- ENDPOINTS DE USUARIOS ---

// 1. LOGIN (Abierto)
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

// 2. CAMBIO CONTRASEÑA INICIAL (Especial: Validado en servicio)
router.patch('/update-password-initial/:id',
    validatorHandler(getUserSchema, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const { password, securityKey } = req.body;
            const result = await service.updatePassword(id, password, securityKey);
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    }
);

// 3. CRUD OPERACIONES (Protegidas con checkAction)

router.get('/users-paginated',
    passport.authenticate('jwt', { session: false }),
   // checkAction('VIEW_USERS'),
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

router.get('/:id',
    passport.authenticate('jwt', { session: false }),
   // checkAction('VIEW_USERS'),
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
   // checkAction('CREATE_USERS'),
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
   // checkAction('UPDATE_USERS'),
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
   // checkAction('DELETE_USERS'),
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
