const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { salesPostInvoiceLine, salesPostInvoice } = sequelize.models;

class salesPostInvoiceLineService {
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['code_document', 'ASC'], ['line_no', 'ASC']],
      where: {},
    };

    if (searchTerm) {
      options.where[Op.or] = [
        { codeDocument: { [Op.iLike]: `%${searchTerm}%` } },
        { codeItem: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    try {
      const { count, rows } = await salesPostInvoiceLine.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar líneas del histórico', error);
    }
  }

  async findOneById(id) {
    const line = await salesPostInvoiceLine.findByPk(id, {
      include: [{ model: salesPostInvoice, as: 'parentDocument' }]
    });
    if (!line) throw boom.notFound('Línea de histórico no encontrada');
    return line;
  }

  async create(data, transaction = null) {
    // Este método suele llamarse desde el registro de la factura cabecera
    return await salesPostInvoiceLine.create(data, { transaction });
  }

  // UPDATE y DELETE no se implementan por normativa Veri*factu
}

module.exports = salesPostInvoiceLineService;
