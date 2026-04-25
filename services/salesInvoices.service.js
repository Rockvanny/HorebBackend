const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const { salesInvoice, salesInvoiceLine } = sequelize.models;
const SalesPostInvoiceService = require('./salesPostInvoice.service');
const postService = new SalesPostInvoiceService();

class salesInvoiceService {
  async findOne(code, options = {}) {
    const { includeLines = false } = options;
    const queryOptions = { where: { code }, include: [] };
    if (includeLines) queryOptions.include.push({ model: salesInvoiceLine, as: 'lines' });

    const record = await salesInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Registro no encontrado');
    return record.get({ plain: true });
  }

  async create(data, userId) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();
    try {
      headerData.username = userId;
      const newInvoice = await salesInvoice.create(headerData, { transaction });

      if (lines && lines.length > 0) {
        const linesToInsert = lines.map((line, index) => ({
          ...line,
          id: undefined, // Aseguramos que no viaje un ID manual
          codeDocument: newInvoice.code,
          lineNo: line.lineNo || (index + 1)
        }));
        await salesInvoiceLine.bulkCreate(linesToInsert, { transaction });
      }

      await transaction.commit();
      return await this.findOne(newInvoice.code, { includeLines: true });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async update(code, changes) {
    const { lines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();
    try {
      const instance = await salesInvoice.findOne({ where: { code }, transaction });
      if (!instance) throw boom.notFound('Registro no encontrado');

      // Protegemos campos críticos
      delete headerChanges.id;
      delete headerChanges.code;

      await instance.update(headerChanges, { transaction });

      if (lines) {
        await salesInvoiceLine.destroy({ where: { codeDocument: code }, transaction });
        const linesToInsert = lines.map((line, index) => {
          const { id, ...cleanLine } = line; // Eliminamos ID de la línea vieja
          return { ...cleanLine, codeDocument: code, lineNo: line.lineNo || (index + 1) };
        });
        await salesInvoiceLine.bulkCreate(linesToInsert, { transaction });
      }

      await transaction.commit();
      return await this.findOne(code, { includeLines: true });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async archiveInvoice(code, userId) {
    const invoice = await salesInvoice.findOne({
      where: { code },
      include: [{ model: salesInvoiceLine, as: 'lines' }]
    });
    if (!invoice) throw boom.notFound('Factura no encontrada');

    const invoiceData = invoice.get({ plain: true });

    // ELIMINACIÓN DE IDs: Crucial para evitar el error de "column id" en el histórico
    delete invoiceData.id;
    if (invoiceData.lines) {
      invoiceData.lines = invoiceData.lines.map(line => {
        const { id, createdAt, updatedAt, ...cleanLine } = line;
        return cleanLine;
      });
    }

    invoiceData.preInvoice = invoiceData.code;
    invoiceData.username = userId;

    const result = await postService.create(invoiceData);
    if (result) await invoice.destroy();
    return result;
  }
}

module.exports = salesInvoiceService;
