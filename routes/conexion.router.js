const express = require('express');
const router = express.Router();
const ConnectionService = require('../services/conexion.service'); // Importamos la clase

const service = new ConnectionService(); // Instanciamos la clase

// Obtener configuración (usamos findPaginated para mantener consistencia con otros módulos)
router.get('/', async (req, res, next) => {
    try {
        const config = await service.findPaginated(req.query);
        res.json(config);
    } catch (error) {
        next(error); // Pasamos el error al middleware de errores (Boom)
    }
});

router.get('/conexion-paginated', async (req, res, next) => {
    try {
        const data = await service.findPaginated(req.query);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

// Guardar nueva configuración
router.post('/', async (req, res, next) => {
    try {
        // En un contexto real, aquí vendría el usuario desde tu middleware de auth: req.user.id
        const userExecutor = req.user?.id || 'system';

        const data = await service.update(null, req.body, userExecutor);
        res.json(data);
    } catch (error) {
        next(error); // Pasamos el error al middleware de errores (Boom)
    }
});

// --- NUEVAS RUTAS (AGREGADAS ABAJO) PARA SOPORTAR EL "VER" Y "EDITAR" ---
// Esto permite que el frontend llame a /api/v1/config/1 sin romper las rutas de arriba
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const config = await service.findOne(id);
        res.json(config);
    } catch (error) {
        next(error);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userExecutor = req.user?.id || 'system';
        const data = await service.update(id, req.body, userExecutor);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
