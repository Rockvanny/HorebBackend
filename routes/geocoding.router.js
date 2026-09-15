const express = require('express');
const passport = require('passport');
const GeocodingService = require('../services/geocoding.service');
const validatorHandler = require('../middlewares/validator.handler');
const { getPostalCodeSchema } = require('../schemas/geocoding.schema');

const router = express.Router();
const service = new GeocodingService();

// Utilidad de apoyo para autocompletar formularios (ver
// geocoding.service.js) — sin checkAction por módulo: no expone datos de
// negocio, solo el callejero público de CartoCiudad.
router.get('/postal-code/:cp',
  passport.authenticate('jwt', { session: false }),
  validatorHandler(getPostalCodeSchema, 'params'),
  async (req, res, next) => {
    try {
      const result = await service.lookupPostalCode(req.params.cp);
      res.json(result ? { found: true, ...result } : { found: false });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
