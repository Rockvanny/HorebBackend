const { models } = require('../libs/sequelize');
const boom = require('@hapi/boom');

class UtilsService {
    /**
     * Extrae los valores de un campo ENUM de cualquier modelo
     */
    async getEnumValues(modelName, fieldName) {
        try {
            const model = models[modelName];
            if (!model) throw boom.notFound(`Modelo ${modelName} no encontrado`);

            const attributes = model.getAttributes();
            const values = attributes[fieldName]?.values;

            if (!values) throw boom.badRequest(`El campo ${fieldName} no es un ENUM o no existe`);

            return values;
        } catch (error) {
            throw boom.badImplementation(`Error al obtener valores de ${fieldName}`);
        }
    }
}

module.exports = UtilsService;
