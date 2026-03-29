const express = require('express');
const StatsService = require('../services/stats.service');
const router = express.Router();
const service = new StatsService();

router.get('/dashboard', async (req, res, next) => {
  try {
    const { searchTerm } = req.query;
    // CAMBIO AQUÍ: Debe coincidir con el nombre en el service
    const data = await service.getBarChartStats(searchTerm);

    return res.json({
      success: true,
      data: data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
