const Joi = require('joi');

const activateLicenseSchema = Joi.object({
  licenseToken: Joi.string().required(),
});

module.exports = { activateLicenseSchema };
