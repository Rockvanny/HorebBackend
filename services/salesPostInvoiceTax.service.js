const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { salesPostInvoiceTax } = sequelize.models;

class salesPostInvoiceTaxService {

  /**
   * Obtiene el desglose legal para auditorías o Veri*factu
   */
  async findByPostInvoice(invoiceCode) {
    return await salesPostInvoiceTax.findAll({
      where: { invoiceCode }
    });
  }

  /**
   * Inserta los impuestos definitivos.
   * Se llama únicamente desde el proceso de archiveInvoice
   */
  async createBulk(taxesData, transaction) {
    try {
      return await salesPostInvoiceTax.bulkCreate(taxesData, { transaction });
    } catch (error) {
      throw boom.badImplementation('Error al registrar los impuestos definitivos', error);
    }
  }
}

module.exports = salesPostInvoiceTaxService;
