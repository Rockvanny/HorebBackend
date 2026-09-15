const Joi = require('joi');

const id = Joi.number().integer();

const queryNotificationsSchema = Joi.object({
  limit: Joi.number().integer().optional(),
  offset: Joi.number().integer().optional(),
  onlyUnread: Joi.boolean().truthy('true').falsy('false').optional(),
});

const getNotificationSchema = Joi.object({
  id: id.required(),
});

module.exports = { queryNotificationsSchema, getNotificationSchema };
