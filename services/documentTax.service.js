const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class DocumentTaxService {
  // Ahora buscamos por el "ADN" del movimiento
  async findByMovement(codeDocument, movementId) {
    return await models.DocumentTax.findAll({
      where: { codeDocument, movementId }
    });
  }

  async createBulk(taxesData, transaction) {
    try {
      return await models.DocumentTax.bulkCreate(taxesData, { transaction });
    } catch (error) {
      throw boom.badImplementation('Error al guardar el desglose de impuestos', error);
    }
  }

  async deleteByMovement(codeDocument, movementId, transaction) {
    await models.DocumentTax.destroy({
      where: { codeDocument, movementId },
      transaction
    });
  }
  
  async updateDocType(newCodeDocument, movementId, transaction) {
    try {
      await models.DocumentTax.update(
        { codeDocument: newCodeDocument },
        {
          where: { movementId },
          transaction
        }
      );
    } catch (error) {
      throw boom.badImplementation('Error al actualizar el tipo de documento en impuestos', error);
    }
  }
}

module.exports = DocumentTaxService;
