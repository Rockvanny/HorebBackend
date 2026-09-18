const express = require('express');
const passport = require('passport');
const IncidentReportService = require('../services/incidentReports.service');
const validatorHandler = require('../middlewares/validator.handler');
const { createIncidentReportSchema } = require('../schemas/incidentReport.schema');

const router = express.Router();
const service = new IncidentReportService();

// Estrategia dedicada 'customer-jwt' (ver libs/customerJwt.strategy.js): un
// token de empleado no sirve aquí, y un token de cliente no sirve en el
// resto de la API -son mundos separados a propósito-.
router.use(passport.authenticate('customer-jwt', { session: false }));

router.post('/',
  validatorHandler(createIncidentReportSchema, 'body'),
  async (req, res, next) => {
    try {
      const report = await service.create(req.user.code, req.body);
      res.status(201).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }
);

// Siempre las del propio cliente autenticado -nunca un :code de otro cliente
// por parámetro, para que no haya ni la tentación de listar incidencias
// ajenas-.
router.get('/mine',
  async (req, res, next) => {
    try {
      const reports = await service.findMine(req.user.code);
      res.json({ success: true, data: reports });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
