const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const StatsService = require('../services/stats.service');
const { checkAction } = require('../middlewares/auth.handler'); // 2. Importar checkAction
const validatorHandler = require('../middlewares/validator.handler');
const { queryStatsSchema } = require('../schemas/stats.schema');

const router = express.Router();
const service = new StatsService();

/**
 * 1. Dashboard General
 * Ruta: /stats/stats?year=2026 (year opcional: por defecto el año en curso)
 */
router.get('/stats',
  passport.authenticate('jwt', { session: false }), // 3. Autenticación obligatoria
  checkAction('VIEW_STATS'), // 4. Requiere allowReports + rol con acción VIEW
  validatorHandler(queryStatsSchema, 'query'),
  async (req, res, next) => {
    try {
      const data = await service.getBarChartStats(req.query.year);
      return res.json({ success: true, data: data });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * 2. Dashboard Filtrado por Presupuesto
 * Ruta: /stats/budget/:code?year=2026 (year opcional, igual que arriba)
 */
router.get('/budget/:code',
  passport.authenticate('jwt', { session: false }),
  checkAction('VIEW_STATS'),
  validatorHandler(queryStatsSchema, 'query'),
  async (req, res, next) => { // Cambiado a next para usar el error handler global
    try {
      const { code } = req.params;
      const stats = await service.getStatsByBudget(code, req.query.year);

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
