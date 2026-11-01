const express = require('express');
const passport = require('passport');
const WeatherService = require('../services/weather.service');
const validatorHandler = require('../middlewares/validator.handler');
const { queryWeatherSchema } = require('../schemas/weather.schema');

const router = express.Router();
const service = new WeatherService();

// Tiempo para el bloque "Hoy" del panel de inicio: en la ciudad de la
// empresa o, con ?lat=&lon=, en la ubicación del equipo (respaldo).
// Sin checkAction por módulo, como /geocoding: no expone datos de negocio.
router.get('/',
  passport.authenticate('jwt', { session: false }),
  validatorHandler(queryWeatherSchema, 'query'),
  async (req, res, next) => {
    try {
      const { lat, lon } = req.query;
      const data = lat !== undefined
        ? await service.getWeatherAt(lat, lon)
        : await service.getCompanyWeather();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
