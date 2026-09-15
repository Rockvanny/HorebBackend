const Joi = require('joi');

const getPostalCodeSchema = Joi.object({
  cp: Joi.string().pattern(/^\d{5}$/).required(),
});

module.exports = { getPostalCodeSchema };
