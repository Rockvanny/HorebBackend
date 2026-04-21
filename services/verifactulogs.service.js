const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const generateVerifactuHash = require('../libs/hasInvoice');

const { VerifactuLog, salesPostInvoice } = sequelize.models;

class VerifactuService {
  constructor() {}

  async createLog(invoiceCode, isTest = false, transaction = null) {
    const t = transaction || await sequelize.transaction();
    try {
      const invoice = await salesPostInvoice.findOne({ where: { code: invoiceCode }, transaction: t });
      if (!invoice) throw boom.notFound('Factura no encontrada para Veri*factu');

      const lastLog = await VerifactuLog.findOne({ order: [['id', 'DESC']], transaction: t });
      const prevFingerprint = lastLog ? lastLog.fingerprint : null;
      const fingerprint = generateVerifactuHash(invoice, prevFingerprint);

      const dateStr = invoice.postingDate instanceof Date ? invoice.postingDate.toISOString().split('T')[0] : invoice.postingDate;

      const payload = {
        emisor: { nif: (invoice.nif || '').trim().toUpperCase(), nombre: (invoice.name || '').trim() },
        factura: {
          numero: invoice.code,
          fecha: dateStr,
          tipo: invoice.typeInvoice || 'F1',
          total: parseFloat(invoice.amountWithVAT || 0).toFixed(2),
          cuota_iva: parseFloat(invoice.amountVAT || 0).toFixed(2)
        },
        timestamp: new Date().toISOString(),
        isTest
      };

      const newLog = await VerifactuLog.create({
        invoiceCode: invoice.code,
        fingerprint,
        prevFingerprint,
        payload,
        isTest
      }, { transaction: t });

      if (!transaction) await t.commit();
      return newLog;
    } catch (error) {
      if (!transaction && t) await t.rollback();
      throw error.isBoom ? error : boom.badImplementation(error);
    }
  }

  async getTraceability(invoiceCode) {
    const log = await VerifactuLog.findOne({
      where: { invoiceCode },
      include: [{ model: salesPostInvoice, as: 'invoice' }]
    });
    if (!log) throw boom.notFound('No hay registro Veri*factu para esta factura');
    return log;
  }

  async findPaginated(query) {
    const { limit, offset, isTest, invoiceCode } = query;
    const where = {};

    // Filtros dinámicos
    if (isTest !== undefined) where.isTest = isTest;
    if (invoiceCode) where.invoiceCode = invoiceCode;

    const options = {
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
      where,
      order: [['id', 'DESC']]
    };
    const { count, rows } = await VerifactuLog.findAndCountAll(options);
    return { records: rows, total: count };
  }
}

module.exports = VerifactuService;
