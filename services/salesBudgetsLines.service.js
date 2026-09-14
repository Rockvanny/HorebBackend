// services/salesBudgetsLines.service.js
const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { salesBudgetLine, salesBudget } = sequelize.models;

// Mismo criterio que saldoFacturado en vendors/customers: F1/F2 suman,
// las rectificativas (R1-R5) restan.
const INVOICED_TYPES = ['F1', 'F2'];
const RECTIFICATION_TYPES = ['R1', 'R2', 'R3', 'R4', 'R5'];

class salesBudgetLineService {
  constructor() { }

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
      const { count, rows } = await salesBudgetLine.findAndCountAll(options);
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
    const line = await salesBudgetLine.findOne({
      where: { codeDocument, lineNo },
      include: options.includeParent ? [{ model: salesBudget, as: 'parentDocument' }] : []
    });
    if (!line) throw boom.notFound(`Línea ${lineNo} del documento ${codeDocument} no encontrada`);
    return line;
  }

  async create(data, transaction = null) {
    const t = transaction || await sequelize.transaction();
    try {
      const existingLine = await salesBudgetLine.findOne({
        where: { codeDocument: data.codeDocument, lineNo: data.lineNo },
        transaction: t
      });

      if (existingLine) throw boom.conflict(`La línea ${data.lineNo} ya existe.`);

      const newLine = await salesBudgetLine.create(data, { transaction: t });
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

  /**
   * Líneas de un presupuesto con la cantidad ya facturada (contra el
   * histórico definitivo sales_post_invoice_lines, no contra borradores) y
   * la cantidad pendiente. Es lo que alimenta el selector de líneas al
   * facturar desde un presupuesto (ver
   * routes/salesInvoices.router.js / fields-salesinvoice-handler.js).
   */
  async getPendingLines(codeDocument) {
    const { salesPostInvoiceLine, salesPostInvoice } = sequelize.models;

    const lines = await salesBudgetLine.findAll({
      where: { codeDocument },
      order: [['lineNo', 'ASC']],
    });

    if (!lines.length) return [];

    // Se agrega en JS en vez de con GROUP BY + include (frágil en Sequelize
    // cuando el agregado y el filtro viven en tablas distintas): el volumen
    // por presupuesto es pequeño, no hay problema de rendimiento real.
    const invoicedLines = await salesPostInvoiceLine.findAll({
      attributes: ['budgetLineNo', 'quantity'],
      where: { budgetLineNo: { [Op.ne]: null } },
      include: [{
        model: salesPostInvoice,
        as: 'parentDocument',
        attributes: ['typeInvoice'],
        where: { budgetCode: codeDocument },
        required: true
      }]
    });

    const invoicedByLine = {};
    invoicedLines.forEach(row => {
      const lineNo = row.budgetLineNo;
      const type = row.parentDocument?.typeInvoice;
      const qty = parseFloat(row.quantity) || 0;
      if (!invoicedByLine[lineNo]) invoicedByLine[lineNo] = 0;

      if (INVOICED_TYPES.includes(type)) invoicedByLine[lineNo] += qty;
      else if (RECTIFICATION_TYPES.includes(type)) invoicedByLine[lineNo] -= qty;
    });

    return lines.map(line => {
      const plain = line.get({ plain: true });
      const invoicedQty = invoicedByLine[plain.lineNo] || 0;
      const pendingQty = Math.max(0, parseFloat(plain.quantity) - invoicedQty);

      return {
        ...plain,
        invoicedQty,
        pendingQty,
        isFullyInvoiced: pendingQty <= 0
      };
    });
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

module.exports = salesBudgetLineService;
