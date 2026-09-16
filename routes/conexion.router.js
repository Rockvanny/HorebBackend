const express = require('express');
const router = express.Router();
const ConnectionService = require('../services/conexion.service'); // Importamos la clase
const { protectedRoute } = require('../libs/router-factory');

const service = new ConnectionService(); // Instanciamos la clase

// CRÍTICO: estas rutas no tenían NINGÚN middleware de autenticación.
// service.find()/findOne() devuelven el objeto de configuración completo
// (config/config.js#getConfig), que incluye dbPassword, jwtSecret y
// aesSecret -es decir, cualquiera que alcanzara el puerto del backend podía
// leer todos los secretos del sistema sin token, con un simple GET-.
// 'conexion' ya es un objeto de MODULE_HIERARCHY.SETUP en access-manager.js,
// así que protectedRoute() resuelve el permiso correctamente sin más cambios.

// Obtener configuración (usamos findPaginated para mantener consistencia con otros módulos)
router.get('/',
  ...protectedRoute('VIEW_CONEXION'),
  async (req, res, next) => {
    try {
        const config = await service.findPaginated(req.query);
        res.json(config);
    } catch (error) {
        next(error); // Pasamos el error al middleware de errores (Boom)
    }
});

router.get('/conexion-paginated',
  ...protectedRoute('VIEW_CONEXION'),
  async (req, res, next) => {
    try {
        const data = await service.findPaginated(req.query);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

// Guardar nueva configuración
router.post('/',
  ...protectedRoute('CREATE_CONEXION'),
  async (req, res, next) => {
    try {
        const userExecutor = req.user?.code || req.user?.id || 'system';

        const data = await service.update(null, req.body, userExecutor);
        res.json(data);
    } catch (error) {
        next(error); // Pasamos el error al middleware de errores (Boom)
    }
});

// --- NUEVAS RUTAS (AGREGADAS ABAJO) PARA SOPORTAR EL "VER" Y "EDITAR" ---
// Esto permite que el frontend llame a /api/v1/config/1 sin romper las rutas de arriba
router.get('/:id',
  ...protectedRoute('VIEW_CONEXION'),
  async (req, res, next) => {
    try {
        const { id } = req.params;
        const config = await service.findOne(id);
        res.json(config);
    } catch (error) {
        next(error);
    }
});

router.patch('/:id',
  ...protectedRoute('UPDATE_CONEXION'),
  async (req, res, next) => {
    try {
        const { id } = req.params;
        const userExecutor = req.user?.code || req.user?.id || 'system';
        const data = await service.update(id, req.body, userExecutor);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
