const Joi = require('joi');
const { CUSTOMER_BUILDING_RELATIONSHIP_TYPES } = require('../db/models/customerBuilding.model');

const id = Joi.string().guid();
const customerCode = Joi.string();
const buildingId = Joi.string().guid();
const unitNumber = Joi.string().allow('', null);
const relationshipType = Joi.string().valid(...CUSTOMER_BUILDING_RELATIONSHIP_TYPES);
const isActive = Joi.boolean();

const createCustomerBuildingSchema = Joi.object({
  customerCode: customerCode.required(),
  buildingId: buildingId.required(),
  unitNumber: unitNumber.optional(),
  relationshipType: relationshipType.default('PROPIETARIO'),
});

const updateCustomerBuildingSchema = Joi.object({
  unitNumber: unitNumber.optional(),
  relationshipType: relationshipType.optional(),
  isActive: isActive.optional(),
});

const getCustomerBuildingSchema = Joi.object({
  id: id.required(),
});

const queryCustomerBuildingSchema = Joi.object({
  customerCode: customerCode.optional(),
  buildingId: buildingId.optional(),
});

module.exports = {
  createCustomerBuildingSchema,
  updateCustomerBuildingSchema,
  getCustomerBuildingSchema,
  queryCustomerBuildingSchema,
};
