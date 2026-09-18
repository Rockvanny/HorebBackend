const express = require('express');
const passport = require('passport');
const boom = require('@hapi/boom');
const CustomerService = require('../services/customers.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkAction } = require('../middlewares/auth.handler');
const { loginLimiter, otpLimiter } = require('../middlewares/rateLimiter');
const {
  createCustomerSchema,
  getCustomerSchema,
  updateCustomerSchema,
  queryCustomerSchema,
  registerCustomerAccountSchema,
  loginCustomerSchema,
  verifyCustomerOtpSchema,
  resendCustomerOtpSchema,
  requestCustomerPasswordResetSchema,
  resetCustomerPasswordSchema
} = require('../schemas/customer.schema');

const router = express.Router();
const service = new CustomerService();

/**
 * AUTOSERVICIO DE CLIENTES (app móvil): sin passport, igual que /users/login
 * -todavía no hay token en este punto-. Van ANTES de '/:code' a propósito:
 * si no, Express interpretaría "register"/"login" como si fueran el
 * parámetro :code de la ruta de abajo.
 */

router.post('/register',
  validatorHandler(registerCustomerAccountSchema, 'body'),
  async (req, res, next) => {
    try {
      const { nif, email, password } = req.body;
      const result = await service.registerAccount(nif, email, password);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/login',
  loginLimiter,
  validatorHandler(loginCustomerSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await service.login(req.body.email, req.body.password);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/login/verify-otp',
  otpLimiter,
  validatorHandler(verifyCustomerOtpSchema, 'body'),
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

router.post('/login/resend-otp',
  otpLimiter,
  validatorHandler(resendCustomerOtpSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await service.resendLoginOtp(req.body.challengeId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// OLVIDÉ MI CONTRASEÑA - PASO 1: sin sesión previa. Si el email existe,
// envía un OTP de reseteo; si no, responde igual para no filtrar por la
// respuesta si el email está registrado.
router.post('/forgot-password',
  loginLimiter,
  validatorHandler(requestCustomerPasswordResetSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await service.requestPasswordReset(req.body.email);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// OLVIDÉ MI CONTRASEÑA - Reenvío de código para un reto pendiente.
router.post('/forgot-password/resend-otp',
  otpLimiter,
  validatorHandler(resendCustomerOtpSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await service.resendPasswordReset(req.body.challengeId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// OLVIDÉ MI CONTRASEÑA - PASO 2: verifica el OTP y fija la nueva contraseña
// en la misma llamada. No requiere contraseña actual: la prueba de identidad
// es el acceso al email.
router.post('/forgot-password/reset',
  otpLimiter,
  validatorHandler(resetCustomerPasswordSchema, 'body'),
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

/**
 * APLICAR AUTENTICACIÓN A TODAS LAS RUTAS
 * Para no repetir la línea en cada ruta, podrías usar:
 * router.use(passport.authenticate('jwt', { session: false }));
 * Pero lo pondré individualmente para mantener tu estilo actual.
 */

router.get('/customers-paginated',
  passport.authenticate('jwt', { session: false }),
  checkAction('VIEW_CUSTOMERS'),
  validatorHandler(queryCustomerSchema, 'query'),
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
  passport.authenticate('jwt', { session: false }),
  checkAction('VIEW_CUSTOMERS'),
  async (req, res, next) => {
    try {
      const { searchTerm } = req.query;
      const customers = await service.search(searchTerm);
      res.json(customers);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:code',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
  checkAction('VIEW_CUSTOMERS'),
  validatorHandler(getCustomerSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const includeDocuments = req.query.include_docs === 'true' || req.query.include_docs === '1';
      const customer = await service.findOne(code, includeDocuments);
      const balances = await service.getBalances(code);
      res.json({ ...customer.toJSON(), ...balances });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
  checkAction('VIEW_CUSTOMERS'),
  validatorHandler(queryCustomerSchema, 'query'),
  async (req, res, next) => {
    try {
      const customers = await service.find(req.query);
      res.json(customers);
    } catch (error) {
      next(error);
    }
  }
);

router.post('/',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
  checkAction('CREATE_CUSTOMERS'),
  validatorHandler(createCustomerSchema, 'body'),
  async (req, res, next) => {
    try {
      const body = req.body;
      // Ahora req.user existe gracias a Passport
      const newCustomer = await service.create(body, req.user.code);
      res.status(201).json(newCustomer);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        // boom.conflict en vez de una forma de respuesta hecha a mano: así
        // el frontend siempre recibe {success, statusCode, error, message}
        // sin importar qué endpoint falle.
        return next(boom.conflict(`El código de cliente '${req.body.code}' ya existe.`));
      }
      next(error);
    }
  }
);

router.patch('/:code',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
  checkAction('UPDATE_CUSTOMERS'),
  validatorHandler(getCustomerSchema, 'params'),
  validatorHandler(updateCustomerSchema, 'body'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      const body = req.body;
      const customer = await service.update(code, body, req.user.code);
      res.json(customer);
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:code',
  passport.authenticate('jwt', { session: false }), // <--- Faltaba
  checkAction('DELETE_CUSTOMERS'),
  validatorHandler(getCustomerSchema, 'params'),
  async (req, res, next) => {
    try {
      const { code } = req.params;
      await service.delete(code, req.user.code);
      res.status(200).json({ code });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
