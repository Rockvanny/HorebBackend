const express = require('express');
const passport = require('passport');
const boom = require('@hapi/boom');
const UserService = require('./../services/user.service');
const validatorHandler = require('./../middlewares/validator.handler');
const { loginLimiter, otpLimiter } = require('../middlewares/rateLimiter');

// NUEVA IMPORTACIÓN: Motor central de acceso y middleware de acciones
const { checkAction: validateAction } = require('../config/access-manager');
const { checkAction } = require('../middlewares/auth.handler');
const {
  updateUserSchema,
  createUserSchema,
  getUserSchema,
  loginUserSchema,
  verifyLoginOtpSchema,
  resendLoginOtpSchema,
  updateOwnPasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema
} = require('./../schemas/user.schema');

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

// 1. LOGIN - PASO 1: valida email+password y envía un código OTP por email.
// No emite JWT todavía (eso ocurre en /login/verify-otp).
router.post('/login',
    loginLimiter,
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

// 1b. LOGIN - PASO 2: verifica el código OTP del reto y, si es correcto, emite el JWT.
router.post('/login/verify-otp',
    otpLimiter,
    validatorHandler(verifyLoginOtpSchema, 'body'),
    async (req, res, next) => {
        try {
            const { challengeId, otp } = req.body;
            const result = await service.verifyLoginOtp(challengeId, otp);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
);

// 1c. LOGIN - Reenvío de código OTP para un reto pendiente.
router.post('/login/resend-otp',
    otpLimiter,
    validatorHandler(resendLoginOtpSchema, 'body'),
    async (req, res, next) => {
        try {
            const { challengeId } = req.body;
            const result = await service.resendLoginOtp(challengeId);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
);

// 1d. OLVIDÉ MI CONTRASEÑA - PASO 1: sin sesión previa. Si el email existe,
// envía un OTP de reseteo; si no, responde igual para no filtrar por la
// respuesta si el email está registrado.
router.post('/forgot-password',
    loginLimiter,
    validatorHandler(requestPasswordResetSchema, 'body'),
    async (req, res, next) => {
        try {
            const result = await service.requestPasswordReset(req.body.email);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
);

// 1e. OLVIDÉ MI CONTRASEÑA - Reenvío de código para un reto pendiente.
router.post('/forgot-password/resend-otp',
    otpLimiter,
    validatorHandler(resendLoginOtpSchema, 'body'),
    async (req, res, next) => {
        try {
            const { challengeId } = req.body;
            const result = await service.resendPasswordReset(challengeId);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
);

// 1f. OLVIDÉ MI CONTRASEÑA - PASO 2: verifica el OTP y fija la nueva
// contraseña en la misma llamada. No requiere sesión ni contraseña actual:
// la prueba de identidad es el acceso al email.
router.post('/forgot-password/reset',
    otpLimiter,
    validatorHandler(resetPasswordSchema, 'body'),
    async (req, res, next) => {
        try {
            const { challengeId, otp, password } = req.body;
            const result = await service.resetPassword(challengeId, otp, password);
            res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    }
);

// 2. CAMBIO DE CONTRASEÑA PROPIO (inicial tras mustChangePassword, o voluntario).
// Requiere sesión válida (login + OTP ya completados) y conocer la contraseña actual.
router.patch('/update-password-initial/:id',
    passport.authenticate('jwt', { session: false }),
    validatorHandler(getUserSchema, 'params'),
    validatorHandler(updateOwnPasswordSchema, 'body'),
    async (req, res, next) => {
        try {
            const { id } = req.params;

            if (id !== req.user.code) {
                throw boom.forbidden('Solo puedes cambiar tu propia contraseña');
            }

            const { currentPassword, password } = req.body;
            const result = await service.updatePassword(id, currentPassword, password);
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
