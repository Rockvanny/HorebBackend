const express = require('express');
const StatsService = require('../services/stats.service');
const router = express.Router();
const service = new StatsService();

// 1. Dashboard General
// Accesible vía: /stats/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const data = await service.getBarChartStats();
    return res.json({ success: true, data: data });
  } catch (error) {
    next(error);
  }
});

// 2. Dashboard Filtrado por Presupuesto
router.get('/budget/:code', async (req, res) => {
  try {
    const { code } = req.params;
    console.log("--> Backend: Buscando estadísticas para el presupuesto:", code);

    const stats = await service.getStatsByBudget(code);

    // IMPORTANTE: Asegura el formato { success: true, data: ... }
    // para que el frontend no rompa al leer response.data
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error en router /budget/:code:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
