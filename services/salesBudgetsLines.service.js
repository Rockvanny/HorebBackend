// services/salesBudgetLine.service.js
const { Op } = require('sequelize');
const boom = require('@hapi/boom');

const sequelize = require('../libs/sequelize');

const { salesBudgetLine, salesBudget } = sequelize.models; // También necesitas salesBudget si asocias con él

class salesBudgetLineService {

  constructor() { }

  async find(query) {
    const options = {
      where: {}
    }
    const { limit, offset } = query;
    if (limit && offset) {
      options.limit = parseInt(limit, 10);
      options.offset = parseInt(offset, 10);
    }
    const lines = await salesBudgetLine.findAll(options);
    return lines;
  }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['codeBudget', 'ASC'], ['lineNo', 'ASC']], // Ordenar por PK compuesta
      where: {},
    }

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
        salesBudgetLines: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en salesBudgetLineService.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar líneas de presupuesto paginadas', error);
    }
  }


  async findOne({ codeBudget, lineNo }, options = {}) {
    const queryOptions = {
      where: {
        codeBudget: codeBudget,
        lineNo: lineNo
      },

      include: []
    }
    if (options.includeBudget) { // Añade una opción para incluir el presupuesto padre
      queryOptions.include.push({
        model: salesBudget,
        as: 'budget' // Alias definido en salesBudgetLine.associate
      });
    }

    const line = await salesBudgetLine.findOne(queryOptions); // Usar findOne en lugar de findByPk para PKs compuestas
    if (!line) {
      throw boom.notFound(`Línea de presupuesto con codeBudget '${codeBudget}' y lineNo '${lineNo}' no encontrada`);
    }
    return line;
  }

  async create(data) {
    let transaction;
    try {
      // Verificar si ya existe una línea con el mismo codeBudget y lineNo
      const existingLine = await salesBudgetLine.findOne({
        where: {
          codeBudget: data.codeBudget,
          lineNo: data.lineNo
        }
      });
      if (existingLine) {
        throw boom.conflict(`Una línea con codeBudget '${data.codeBudget}' y lineNo '${data.lineNo}' ya existe.`);
      }

      transaction = await sequelize.transaction();
      const newSalesBudgetLine = await salesBudgetLine.create(data, { transaction });
      await transaction.commit();
      return newSalesBudgetLine;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Error en salesBudgetLineService.create: ', error);
      // El boom.conflict ya maneja la duplicidad, otros errores son badImplementation
      if (error.isBoom) throw error; // Re-lanza errores boom
      throw boom.badImplementation('Error al crear la línea de presupuesto', error);
    }
  }

  // *** update corregido para aceptar la clave primaria compuesta ***
  async update({ codeBudget, lineNo }, changes) {
    console.log(`\n--- DEBUG: Dentro de salesBudgetLineService.update(${codeBudget}-${lineNo}, changes) ---`);
    const line = await this.findOne({ codeBudget, lineNo }); // Buscar la línea por su PK compuesta

    const updatedLine = await line.update(changes);
    return updatedLine;
  }

  // *** delete corregido para aceptar la clave primaria compuesta ***
  async delete({ codeBudget, lineNo }) {
    const lineToDelete = await this.findOne({ codeBudget, lineNo }); // Buscar la línea por su PK compuesta
    if (!lineToDelete) {
      throw boom.notFound(`Línea de presupuesto con codeBudget '${codeBudget}' y lineNo '${lineNo}' no encontrada`);
    }

    await salesBudgetLine.destroy({
      where: {
        codeBudget: codeBudget,
        lineNo: lineNo
      }
    });

    return { codeBudget, lineNo, message: 'Línea eliminada' };
  }
}

module.exports = salesBudgetLineService;
