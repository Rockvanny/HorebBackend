const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { purchInvoiceLine, purchInvoice } = sequelize.models;

class purchInvoiceLineService {
  constructor() {}

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']], // Ordenamos por fecha de creación por defecto
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
      const { count, rows } = await purchInvoiceLine.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar líneas de compra', error);
    }
  }

  // Ahora busca por ID primario para mayor simplicidad y rapidez
  async findOne(id, options = {}) {
    const line = await purchInvoiceLine.findByPk(id, {
      include: options.includeParent ? [{ model: purchInvoice, as: 'parentDocument' }] : []
    });

    if (!line) throw boom.notFound(`Línea con ID ${id} no encontrada`);
    return line;
  }

  async create(data, userId) {
    // Verificamos el índice de negocio (Documento + Nº Línea) para evitar duplicados
    const existingLine = await purchInvoiceLine.findOne({
      where: {
        codeDocument: data.codeDocument,
        lineNo: data.lineNo
      }
    });

    if (existingLine) {
      throw boom.conflict(`La línea ${data.lineNo} ya existe en el documento ${data.codeDocument}`);
    }

    // Inyectamos el usuario de auditoría
    const dataWithUser = { ...data, userName: userId };

    return await purchInvoiceLine.create(dataWithUser);
  }

  async update(id, changes) {
    const line = await this.findOne(id);

    // Evitamos que se alteren campos clave por error
    delete changes.id;
    delete changes.codeDocument;

    return await line.update(changes);
  }

  async delete(id) {
    const line = await this.findOne(id);
    await line.destroy();

    return { id, message: 'Línea de compra eliminada correctamente' };
  }
}

module.exports = purchInvoiceLineService;
