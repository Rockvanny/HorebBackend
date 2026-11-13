const express = require('express');
const passport = require('passport'); // 1. Importar Passport
const StatsService = require('../services/stats.service');
const { checkAction } = require('../middlewares/auth.handler'); // 2. Importar checkAction
const validatorHandler = require('../middlewares/validator.handler');
const { queryStatsSchema, areaParamsSchema, queryAreaStatsSchema } = require('../schemas/stats.schema');

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

/**
 * 3. Inicio por módulos, para quien no tiene el módulo Reportes (ver
 * service#getAreaStats): cada área exige el permiso de ver su listado, no
 * VIEW_STATS. Ruta: /stats/area/sales?year=2026&budget=PRE-001
 */
const AREA_ACTIONS = {
  sales: 'VIEW_SALESINVOICES',
  purchases: 'VIEW_PURCHINVOICES',
  expenses: 'VIEW_OPERATINGEXPENSES'
};

router.get('/area/:area',
  passport.authenticate('jwt', { session: false }),
  validatorHandler(areaParamsSchema, 'params'),
  (req, res, next) => checkAction(AREA_ACTIONS[req.params.area])(req, res, next),
  validatorHandler(queryAreaStatsSchema, 'query'),
  async (req, res, next) => {
    try {
      const { area } = req.params;
      const data = await service.getAreaStats(area, req.query.year, req.query.budget);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
