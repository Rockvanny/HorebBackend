// services/purchInvoiceLine.service.js
const { Op } = require('sequelize');
const boom = require('@hapi/boom');

const sequelize = require('../libs/sequelize');

const { purchInvoiceLine, purchInvoice } = sequelize.models; // También necesitas purchInvoice si asocias con él

class purchInvoiceLineService {

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
    const lines = await purchInvoiceLine.findAll(options);
    return lines;
  }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['codeInvoice', 'ASC'], ['lineNo', 'ASC']], // Ordenar por PK compuesta
      where: {},
    }

    if (searchTerm) {
      options.where[Op.or] = [
        { codeInvoice: { [Op.iLike]: `%${searchTerm}%` } },
        { codeItem: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    try {
      const { count, rows } = await purchInvoiceLine.findAndCountAll(options);
      return {
        purchInvoiceLines: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en purchInvoiceLineService.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar líneas de facturas paginadas', error);
    }
  }


  async findOne({ codeInvoice, lineNo }, options = {}) {
    const queryOptions = {
      where: {
        codeInvoice: codeInvoice,
        lineNo: lineNo
      },

      include: []
    }
    if (options.includeInvoice) { // Añade una opción para incluir el facturas padre
      queryOptions.include.push({
        model: purchInvoice,
        as: 'invoice' // Alias definido en purchInvoiceLine.associate
      });
    }

    const line = await purchInvoiceLine.findOne(queryOptions); // Usar findOne en lugar de findByPk para PKs compuestas
    if (!line) {
      throw boom.notFound(`Línea de facturas con codeInvoice '${codeInvoice}' y lineNo '${lineNo}' no encontrada`);
    }
    return line;
  }

  async create(data) {
    let transaction;
    try {
      // Verificar si ya existe una línea con el mismo codeInvoice y lineNo
      const existingLine = await purchInvoiceLine.findOne({
        where: {
          codeInvoice: data.codeInvoice,
          lineNo: data.lineNo
        }
      });
      if (existingLine) {
        throw boom.conflict(`Una línea con codeInvoice '${data.codeInvoice}' y lineNo '${data.lineNo}' ya existe.`);
      }

      transaction = await sequelize.transaction();
      const newpurchInvoiceLine = await purchInvoiceLine.create(data, { transaction });
      await transaction.commit();
      return newpurchInvoiceLine;
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Error en purchInvoiceLineService.create: ', error);
      // El boom.conflict ya maneja la duplicidad, otros errores son badImplementation
      if (error.isBoom) throw error; // Re-lanza errores boom
      throw boom.badImplementation('Error al crear la línea de facturas', error);
    }
  }

  // *** update corregido para aceptar la clave primaria compuesta ***
  async update({ codeInvoice, lineNo }, changes) {
    console.log(`\n--- DEBUG: Dentro de purchInvoiceLineService.update(${codeInvoice}-${lineNo}, changes) ---`);
    const line = await this.findOne({ codeInvoice, lineNo }); // Buscar la línea por su PK compuesta

    const updatedLine = await line.update(changes);
    return updatedLine;
  }

  // *** delete corregido para aceptar la clave primaria compuesta ***
  async delete({ codeInvoice, lineNo }) {
    const lineToDelete = await this.findOne({ codeInvoice, lineNo }); // Buscar la línea por su PK compuesta
    if (!lineToDelete) {
      throw boom.notFound(`Línea de facturas con codeInvoice '${codeInvoice}' y lineNo '${lineNo}' no encontrada`);
    }

    await purchInvoiceLine.destroy({
      where: {
        codeInvoice: codeInvoice,
        lineNo: lineNo
      }
    });

    return { codeInvoice, lineNo, message: 'Línea eliminada' };
  }
}

module.exports = purchInvoiceLineService;
