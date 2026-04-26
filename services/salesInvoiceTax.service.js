const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { salesInvoiceTax } = sequelize.models;

class salesInvoiceTaxService {

  /**
   * Busca todos los impuestos de una factura específica
   */
  async findByInvoice(invoiceCode) {
    const taxes = await salesInvoiceTax.findAll({
      where: { invoiceCode }
    });
    return taxes;
  }

  /**
   * Crea el desglose de impuestos (bulk)
   * Generalmente llamado desde el service de la factura
   */
  async createBulk(taxesData, transaction) {
    try {
      return await salesInvoiceTax.bulkCreate(taxesData, { transaction });
    } catch (error) {
      throw boom.badImplementation('Error al crear el desglose de impuestos', error);
    }
  }

  /**
   * Elimina los impuestos de una factura para recalcularlos
   */
  async deleteByInvoice(invoiceCode, transaction) {
    await salesInvoiceTax.destroy({
      where: { invoiceCode },
      transaction
    });
  }
}

module.exports = salesInvoiceTaxService;
