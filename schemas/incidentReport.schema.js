const Joi = require('joi');

const title = Joi.string().min(3).max(150);
const description = Joi.string().min(3).max(2000);
// Opcional: a qué edificio se refiere -relevante solo si el cliente está
// vinculado a más de uno, ver customerBuildings.router.js#/mine-. La
// pertenencia real (que sea SU edificio) se valida en el service, no aquí.
const buildingId = Joi.string().guid().allow(null);

const createIncidentReportSchema = Joi.object({
  title: title.required(),
  description: description.required(),
  buildingId: buildingId.optional(),
});

module.exports = { createIncidentReportSchema };
