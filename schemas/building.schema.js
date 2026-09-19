const Joi = require('joi');
const { BUILDING_CONTRACT_STATUSES } = require('../db/models/building.model');

const id = Joi.string().guid();
const name = Joi.string().min(3).max(150);
const address = Joi.string().min(3).max(255);
const postCode = Joi.string().allow('', null);
const city = Joi.string().allow('', null);
const province = Joi.string().allow('', null);
const contractCode = Joi.string().allow('', null);
const contractStartDate = Joi.date().iso().allow(null);
const contractEndDate = Joi.date().iso().allow(null);
const contractStatus = Joi.string().valid(...BUILDING_CONTRACT_STATUSES);
const maintenanceScope = Joi.string().allow('', null);
const administratorName = Joi.string().allow('', null);
const administratorPhone = Joi.string().allow('', null);
const notes = Joi.string().allow('', null);

const createBuildingSchema = Joi.object({
  name: name.required(),
  address: address.required(),
  postCode: postCode.optional(),
  city: city.optional(),
  province: province.optional(),
  contractCode: contractCode.optional(),
  contractStartDate: contractStartDate.optional(),
  contractEndDate: contractEndDate.optional(),
  contractStatus: contractStatus.default('ACTIVO'),
  maintenanceScope: maintenanceScope.optional(),
  administratorName: administratorName.optional(),
  administratorPhone: administratorPhone.optional(),
  notes: notes.optional(),
});

const updateBuildingSchema = Joi.object({
  name: name.optional(),
  address: address.optional(),
  postCode: postCode.optional(),
  city: city.optional(),
  province: province.optional(),
  contractCode: contractCode.optional(),
  contractStartDate: contractStartDate.optional(),
  contractEndDate: contractEndDate.optional(),
  contractStatus: contractStatus.optional(),
  maintenanceScope: maintenanceScope.optional(),
  administratorName: administratorName.optional(),
  administratorPhone: administratorPhone.optional(),
  notes: notes.optional(),
});

const getBuildingSchema = Joi.object({
  id: id.required(),
});

const queryBuildingSchema = Joi.object({
  searchTerm: Joi.string().allow('').optional(),
  contractStatus: contractStatus.optional(),
  limit: Joi.number().integer().min(1).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

module.exports = {
  createBuildingSchema,
  updateBuildingSchema,
  getBuildingSchema,
  queryBuildingSchema,
};
