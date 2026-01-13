const Joi = require('joi');

const id = Joi.number();
const logo_base64 = Joi.string().allow(null, '').pattern(/^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=])+$/);
const name = Joi.string().min(3).max(50);
const vatRegistration = Joi.string();
const email = Joi.string().email();
const phone =  Joi.string();
const address = Joi.string();
const postCode = Joi.string();
const city =  Joi.string();
const bank = Joi.string();
const accountBank = Joi.string();
const WebSite = Joi.string();
const footerText = Joi.string();

const getCompanySchema = Joi.object({
  id: id.optional(),
});

const createCompanySchema = Joi.object({
  logo_base64: logo_base64.optional(),
  vatRegistration: vatRegistration.optional(),
  name: name.optional(),
  email: email.optional(),
  phone: phone.optional(),
  address: address.optional(),
  postCode: postCode.optional(),
  city: city.optional(),
  bank: bank.optional(),
  accountBank: accountBank.optional(),
  WebSite: WebSite.optional(),
  footerText: footerText.optional()
});

const updateCompanySchema = Joi.object({
  logo_base64: logo_base64.optional(),
  vatRegistration: vatRegistration.optional(),
  name: name.optional(),
  email: email.optional(),
  phone: phone.optional(),
  address: address.optional(),
  postCode: postCode.optional(),
  city: city.optional(),
  bank: bank.optional(),
  accountBank: accountBank.optional(),
  WebSite: WebSite.optional(),
  footerText: footerText.optional()
});

module.exports = { getCompanySchema, createCompanySchema, updateCompanySchema };
