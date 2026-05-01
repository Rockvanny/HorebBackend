const Joi = require('joi');

// --- Definición de tipos basados en tu CompanySchema ---
const id = Joi.number().integer();

// Regex para validar el formato Base64 que genera el frontend
const imageBase64 = Joi.string().allow(null, '').pattern(/^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=])+$/);

const name = Joi.string().min(3).max(100).allow(null, '');
const vatRegistration = Joi.string().allow(null, ''); // Mismo nombre que en el modelo
const email = Joi.string().email().allow(null, '');
const phone = Joi.string().allow(null, '');
const address = Joi.string().allow(null, '');
const postCode = Joi.string().allow(null, ''); // Mismo nombre que la llave
const city = Joi.string().allow(null, '');
const bankName = Joi.string().allow(null, '');
const iban = Joi.string().allow(null, '');
const swift = Joi.string().allow(null, '');
const WebSite = Joi.string().allow(null, ''); // Respetando la mayúscula del modelo
const footerText = Joi.string().allow(null, '');


const limit = Joi.number().integer();
const offset = Joi.number().integer();
// --- Esquemas de Objeto ---

const getCompanySchema = Joi.object({
    id: id.optional(),
});

const createCompanySchema = Joi.object({
    // id es auto-incremental, por lo que suele ser opcional en la creación
    id: id.optional(),
    logo_base64: imageBase64.optional(),
    name: name.optional(),
    vatRegistration: vatRegistration.optional(),
    email: email.optional(),
    phone: phone.optional(),
    address: address.optional(),
    postCode: postCode.optional(),
    city: city.optional(),
    bankName: bankName.optional(),
    iban: iban.optional(),
    swift: swift.optional(),
    signature_base64: imageBase64.optional(),
    WebSite: WebSite.optional(),
    footerText: footerText.optional()
});

const updateCompanySchema = Joi.object({
    // En actualización no pasamos el ID en el body, se suele pasar por URL
    logo_base64: imageBase64.optional(),
    name: name.optional(),
    vatRegistration: vatRegistration.optional(),
    email: email.optional(),
    phone: phone.optional(),
    address: address.optional(),
    postCode: postCode.optional(),
    city: city.optional(),
    bankName: bankName.optional(),
    iban: iban.optional(),
    swift: swift.optional(),
    signature_base64: imageBase64.optional(),
    WebSite: WebSite.optional(),
    footerText: footerText.optional()
});

const queryCompanySchema = Joi.object({
  limit,
  offset,
  searchTerm: Joi.string().allow(null, '')
});

module.exports = {
    getCompanySchema,
    createCompanySchema,
    updateCompanySchema,
    queryCompanySchema
};
