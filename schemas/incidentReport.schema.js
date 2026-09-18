const Joi = require('joi');

const title = Joi.string().min(3).max(150);
const description = Joi.string().min(3).max(2000);

const createIncidentReportSchema = Joi.object({
  title: title.required(),
  description: description.required(),
});

module.exports = { createIncidentReportSchema };
