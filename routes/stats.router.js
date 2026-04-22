const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const StatsService = require('../services/stats.service');
const { checkPermission } = require('../middlewares/auth.handler'); // 2. Importar checkPermission

const router = express.Router();
const service = new StatsService();

/**
 * 1. Dashboard General
 * Ruta: /stats/stats (O /stats dependiendo de cómo esté montado en index.js)
 */
router.get('/stats',
  passport.authenticate('jwt', { session: false }), // 3. Autenticación obligatoria
  checkPermission('allowGestion'), // 4. Permiso de ventas para ver estadísticas
  async (req, res, next) => {
    try {
      const data = await service.getBarChartStats();
      return res.json({ success: true, data: data });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 2. Dashboard Filtrado por Presupuesto
 * Ruta: /stats/budget/:code
 */
router.get('/budget/:code',
  passport.authenticate('jwt', { session: false }),
  checkPermission('allowGestion'),
  async (req, res, next) => { // Cambiado a next para usar el error handler global
    try {
      const { code } = req.params;
      const stats = await service.getStatsByBudget(code);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      // Usamos next(error) para mantener la consistencia con el resto de la App
      next(error);
    }
  }
);

module.exports = router;
