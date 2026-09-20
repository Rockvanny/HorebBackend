const express = require('express');
const passport = require('passport');
const EmployeesService = require('../services/employees.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkRole } = require('../middlewares/auth.handler');
const { loginLimiter, otpLimiter } = require('../middlewares/rateLimiter');
const {
  createEmployeeSchema,
  updateEmployeeSchema,
  getEmployeeSchema,
  loginEmployeeSchema,
  verifyEmployeeOtpSchema,
  resendEmployeeOtpSchema,
  requestEmployeePasswordResetSchema,
  resetEmployeePasswordSchema,
} = require('../schemas/employee.schema');

const router = express.Router();
const service = new EmployeesService();

/**
 * LOGIN de empleado (app móvil): mismo login en 2 pasos que Users/Customers,
 * pero contra 'employees' -tabla totalmente independiente, ver
 * employee.model.js-. Sin sesión previa, van antes de cualquier auth.
 */

router.post('/login',
  loginLimiter,
  validatorHandler(loginEmployeeSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await service.login(req.body.email, req.body.password);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

router.post('/login/verify-otp',
  otpLimiter,
  validatorHandler(verifyEmployeeOtpSchema, 'body'),
  async (req, res, next) => {
    try {
      const { challengeId, otp } = req.body;
      const result = await service.verifyLoginOtp(challengeId, otp);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

router.post('/login/resend-otp',
  otpLimiter,
  validatorHandler(resendEmployeeOtpSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await service.resendLoginOtp(req.body.challengeId);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

// --- "Olvidé mi contraseña" (sin sesión previa) ---

router.post('/forgot-password',
  loginLimiter,
  validatorHandler(requestEmployeePasswordResetSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await service.requestPasswordReset(req.body.email);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

router.post('/forgot-password/resend-otp',
  otpLimiter,
  validatorHandler(resendEmployeeOtpSchema, 'body'),
  async (req, res, next) => {
    try {
      const result = await service.resendPasswordReset(req.body.challengeId);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

router.post('/forgot-password/reset',
  otpLimiter,
  validatorHandler(resetEmployeePasswordSchema, 'body'),
  async (req, res, next) => {
    try {
      const { challengeId, otp, password } = req.body;
      const result = await service.resetPassword(challengeId, otp, password);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }
);

/**
 * CRUD de empleados: admin exclusivamente, alcanzable tanto desde escritorio
 * (User admin, ej. una futura pantalla de Frontend) como desde la propia
 * app (Employee admin) -mismo criterio de auth dual que buildings.router.js
 * para sus rutas de solo lectura-.
 */
const adminAuth = [passport.authenticate(['jwt', 'employee-jwt'], { session: false }), checkRole('admin')];

router.post('/',
  ...adminAuth,
  validatorHandler(createEmployeeSchema, 'body'),
  async (req, res, next) => {
    try {
      const employee = await service.create(req.body);
      res.status(201).json({ success: true, data: employee });
    } catch (error) { next(error); }
  }
);

router.get('/employees-paginated',
  ...adminAuth,
  async (req, res, next) => {
    try {
      const { limit, offset, searchTerm } = req.query;
      const result = await service.findPaginated({ limit, offset, searchTerm });
      res.json(result);
    } catch (error) { next(error); }
  }
);

router.get('/:id',
  ...adminAuth,
  validatorHandler(getEmployeeSchema, 'params'),
  async (req, res, next) => {
    try {
      const employee = await service.findOne(req.params.id);
      res.json({ success: true, data: employee });
    } catch (error) { next(error); }
  }
);

router.patch('/:id',
  ...adminAuth,
  validatorHandler(getEmployeeSchema, 'params'),
  validatorHandler(updateEmployeeSchema, 'body'),
  async (req, res, next) => {
    try {
      const employee = await service.update(req.params.id, req.body);
      res.json({ success: true, data: employee });
    } catch (error) { next(error); }
  }
);

router.delete('/:id',
  ...adminAuth,
  validatorHandler(getEmployeeSchema, 'params'),
  async (req, res, next) => {
    try {
      const result = await service.delete(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

module.exports = router;
