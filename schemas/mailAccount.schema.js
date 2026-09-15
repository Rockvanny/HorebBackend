const Joi = require('joi');

const createMailAccountSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(150).required(),
  password: Joi.string().min(1).max(255).required(),
  imapHost: Joi.string().min(3).max(255).required(),
  imapPort: Joi.number().integer().min(1).max(65535).default(993),
  imapSecure: Joi.boolean().default(true),
});

const queryMailSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(25),
  offset: Joi.number().integer().min(0).default(0),
});

const getMailMessageSchema = Joi.object({
  uid: Joi.number().integer().required(),
});

module.exports = { createMailAccountSchema, queryMailSchema, getMailMessageSchema };
