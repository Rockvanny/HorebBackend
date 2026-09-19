const Joi = require('joi');
const { TASK_TYPES, TASK_STATUSES, TASK_PRIORITIES } = require('../db/models/task.model');

const id = Joi.string().guid();
const title = Joi.string().min(3).max(150);
const description = Joi.string().min(3).max(2000);
const type = Joi.string().valid(...TASK_TYPES);
const status = Joi.string().valid(...TASK_STATUSES);
const priority = Joi.string().valid(...TASK_PRIORITIES);
const dueDate = Joi.date().iso().allow(null);
const assignedTo = Joi.string();
// Ubicación: opcional siempre a nivel de validación -solo tiene sentido
// rellenarla para OPERATIVA_CAMPO, pero no se fuerza aquí, ver task.model.js-.
const address = Joi.string().allow('', null);
const postCode = Joi.string().allow('', null);
const city = Joi.string().allow('', null);

const createTaskSchema = Joi.object({
  title: title.required(),
  description: description.required(),
  type: type.required(),
  priority: priority.default('MEDIA'),
  dueDate: dueDate.optional(),
  assignedTo: assignedTo.required(),
  address: address.optional(),
  postCode: postCode.optional(),
  city: city.optional(),
});

const updateTaskSchema = Joi.object({
  title: title.optional(),
  description: description.optional(),
  type: type.optional(),
  status: status.optional(),
  priority: priority.optional(),
  dueDate: dueDate.optional(),
  assignedTo: assignedTo.optional(),
  address: address.optional(),
  postCode: postCode.optional(),
  city: city.optional(),
});

const updateTaskStatusSchema = Joi.object({
  status: status.required(),
});

const getTaskSchema = Joi.object({
  id: id.required(),
});

const queryTaskSchema = Joi.object({
  status: status.optional(),
  type: type.optional(),
  limit: Joi.number().integer().optional(),
  offset: Joi.number().integer().optional(),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  getTaskSchema,
  queryTaskSchema,
};
