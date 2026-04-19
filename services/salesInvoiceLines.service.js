const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { salesInvoiceLine, salesInvoice } = sequelize.models;

class salesInvoiceLineService {
  constructor() { }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      // Normalizado: Usamos los nombres de columna de la DB o alias del modelo
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
      const { count, rows } = await salesInvoiceLine.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar líneas', error);
    }
  }

  async findOne({ codeDocument, lineNo }, options = {}) {
    const line = await salesInvoiceLine.findOne({
      where: { codeDocument, lineNo },
      include: options.includeParent ? [{ model: salesInvoice, as: 'parentDocument' }] : []
    });

    if (!line) throw boom.notFound(`Línea ${lineNo} del documento ${codeDocument} no encontrada`);
    return line;
  }

  async create(data, transaction = null) {
    const t = transaction || await sequelize.transaction();
    try {
      const existingLine = await salesInvoiceLine.findOne({
        where: { codeDocument: data.codeDocument, lineNo: data.lineNo },
        transaction: t
      });

      if (existingLine) throw boom.conflict(`La línea ${data.lineNo} ya existe.`);

      const newLine = await salesInvoiceLine.create(data, { transaction: t });

      if (!transaction) await t.commit();
      return newLine;
    } catch (error) {
      if (!transaction) await t.rollback();
      throw error.isBoom ? error : boom.badImplementation(error);
    }
  }

  async update({ codeDocument, lineNo }, changes, transaction = null) {
    const t = transaction || await sequelize.transaction();
    try {
      const line = await this.findOne({ codeDocument, lineNo });
      const updatedLine = await line.update(changes, { transaction: t });

      if (!transaction) await t.commit();
      return updatedLine;
    } catch (error) {
      if (!transaction) await t.rollback();
      throw error;
    }
  }

  async delete({ codeDocument, lineNo }, transaction = null) {
    const t = transaction || await sequelize.transaction();
    try {
      const line = await this.findOne({ codeDocument, lineNo });
      await line.destroy({ transaction: t });

      if (!transaction) await t.commit();
      return { codeDocument, lineNo, message: 'Eliminado correctamente' };
    } catch (error) {
      if (!transaction) await t.rollback();
      throw error;
    }
  }
}

module.exports = salesInvoiceLineService;
