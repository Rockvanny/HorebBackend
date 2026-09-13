const Joi = require('joi');

const createFirstAdminSchema = Joi.object({
  fullName: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

module.exports = { createFirstAdminSchema };
