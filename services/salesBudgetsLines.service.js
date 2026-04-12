const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const { salesBudgetLine, salesBudget } = sequelize.models;

class salesBudgetLineService {

  constructor() { }

  /**
   * Consulta paginada normalizada
   * Retorna 'records' para consistencia con el Frontend
   */
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['code_budget', 'ASC'], ['line_no', 'ASC']],
      where: {},
    };

    if (searchTerm) {
      options.where[Op.or] = [
        { codeBudget: { [Op.iLike]: `%${searchTerm}%` } },
        { codeItem: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    try {
      const { count, rows } = await salesBudgetLine.findAndCountAll(options);
      return {
        records: rows, // Clave genérica para el Front
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar líneas', error);
    }
  }

  async findOne({ codeBudget, lineNo }, options = {}) {
    const queryOptions = {
      where: { codeBudget, lineNo },
      include: []
    };

    if (options.includeBudget) {
      queryOptions.include.push({
        model: salesBudget,
        as: 'budget'
      });
    }

    const line = await salesBudgetLine.findOne(queryOptions);
    if (!line) {
      throw boom.notFound(`Línea ${lineNo} del documento ${codeBudget} no encontrada`);
    }
    return line;
  }

  async create(data) {
    const transaction = await sequelize.transaction();
    try {
      const existingLine = await salesBudgetLine.findOne({
        where: { codeBudget: data.codeBudget, lineNo: data.lineNo },
        transaction
      });

      if (existingLine) {
        throw boom.conflict(`La línea ${data.lineNo} ya existe en el documento ${data.codeBudget}`);
      }

      const newLine = await salesBudgetLine.create(data, { transaction });
      await transaction.commit();
      return newLine;
    } catch (error) {
      if (transaction) await transaction.rollback();
      if (error.isBoom) throw error;
      throw boom.badImplementation('Error al crear el registro', error);
    }
  }

  async update({ codeBudget, lineNo }, changes) {
    const transaction = await sequelize.transaction();
    try {
      const line = await this.findOne({ codeBudget, lineNo });
      const updatedLine = await line.update(changes, { transaction });
      await transaction.commit();
      return updatedLine;
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async delete({ codeBudget, lineNo }) {
    const transaction = await sequelize.transaction();
    try {
      const line = await this.findOne({ codeBudget, lineNo });
      await line.destroy({ transaction });
      await transaction.commit();
      return { codeBudget, lineNo, message: 'Registro eliminado correctamente' };
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }
}

module.exports = salesBudgetLineService;
