const Joi = require('joi');

const Userid = Joi.number();
const email = Joi.string().email();
const password = Joi.string().min(8);
const role = Joi.string().min(5);

const limit = Joi.number().integer();
const offset = Joi.number().integer();

const createUserSchema = Joi.object({
  Userid: Userid.required(),
  password: password.required(),
  role: role.required()
});

const updateUserSchema = Joi.object({
  email: email,
  role: role,
});

const getUserSchema = Joi.object({
  Userid: Userid.required(),
});

module.exports = { createUserSchema, updateUserSchema, getUserSchema }
