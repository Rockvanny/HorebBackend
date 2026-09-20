const express = require('express');
const passport = require('passport');
const TasksService = require('../services/tasks.service');
const validatorHandler = require('../middlewares/validator.handler');
const { checkRole } = require('../middlewares/auth.handler');
const {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  getTaskSchema,
  queryTaskSchema
} = require('../schemas/task.schema');

const router = express.Router();
const service = new TasksService();

// Todas las rutas de tareas son de la app móvil (estrategia 'employee-jwt',
// tabla 'employees' -flujo separado de 'users'/escritorio y de
// 'customer-jwt' desde 2026-09-20-). No hay pantalla de Tareas en el
// Frontend, así que no hace falta aceptar también 'jwt' aquí.
router.use(passport.authenticate('employee-jwt', { session: false }));

/**
 * Crear tarea: exclusivo de admin -"Crear tarea" en Gestión/Oficina de la
 * app móvil, ver AndroidApp/ui/office/OfficeScreen.kt-.
 */
router.post('/',
  checkRole('admin'),
  validatorHandler(createTaskSchema, 'body'),
  async (req, res, next) => {
    try {
      const task = await service.create(req.body, req.user.code);
      res.status(201).json({ success: true, data: task });
    } catch (error) { next(error); }
  }
);

/**
 * Vista global de admin ("Ver estados globales" en Gestión/Oficina): todas
 * las tareas, filtrables por status/type.
 */
router.get('/',
  checkRole('admin'),
  validatorHandler(queryTaskSchema, 'query'),
  async (req, res, next) => {
    try {
      const tasks = await service.findAll(req.query);
      res.json({ success: true, data: tasks });
    } catch (error) { next(error); }
  }
);

/**
 * Tareas del propio empleado autenticado -pestaña "Tareas" del móvil, ver
 * AndroidApp/ui/tasks/TasksScreen.kt-. Va ANTES de '/:id' a propósito, si no
 * Express interpretaría "mine" como el :id de la ruta de abajo.
 */
router.get('/mine',
  async (req, res, next) => {
    try {
      const tasks = await service.findMine(req.user.code);
      res.json({ success: true, data: tasks });
    } catch (error) { next(error); }
  }
);

// Detalle completo (modal del móvil al tocar una tarea). No-admin: solo si
// es la suya, ver TasksService#findOne.
router.get('/:id',
  validatorHandler(getTaskSchema, 'params'),
  async (req, res, next) => {
    try {
      const task = await service.findOne(req.params.id, req.user);
      res.json({ success: true, data: task });
    } catch (error) { next(error); }
  }
);

/**
 * Actualizar SOLO el estado: la acción "Actualizar estado / Subir parte" del
 * dashboard móvil. externo no puede -solo tiene VIEW en
 * access-manager.js#ROLE_ACTIONS, igual razón que en el resto de la app-.
 */
router.patch('/:id/status',
  checkRole('admin', 'operario', 'vendedor'),
  validatorHandler(getTaskSchema, 'params'),
  validatorHandler(updateTaskStatusSchema, 'body'),
  async (req, res, next) => {
    try {
      const task = await service.updateStatus(req.params.id, req.body.status, req.user);
      res.json({ success: true, data: task });
    } catch (error) { next(error); }
  }
);

// Edición completa: exclusiva de admin.
router.patch('/:id',
  checkRole('admin'),
  validatorHandler(getTaskSchema, 'params'),
  validatorHandler(updateTaskSchema, 'body'),
  async (req, res, next) => {
    try {
      const task = await service.update(req.params.id, req.body);
      res.json({ success: true, data: task });
    } catch (error) { next(error); }
  }
);

// Borrar: exclusiva de admin.
router.delete('/:id',
  checkRole('admin'),
  validatorHandler(getTaskSchema, 'params'),
  async (req, res, next) => {
    try {
      const result = await service.delete(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
);

module.exports = router;
