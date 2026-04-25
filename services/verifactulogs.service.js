const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const generateVerifactuHash = require('../libs/hasInvoice');

const { VerifactuLog, salesPostInvoice } = sequelize.models;

class VerifactuService {
  constructor() { }

  async createLog(invoiceCode, isTest = false, transaction = null) {
    const t = transaction || await sequelize.transaction();
    try {
      // 1. Obtener los datos de la factura recién creada
      const invoice = await salesPostInvoice.findOne({
        where: { code: invoiceCode },
        transaction: t
      });

      if (!invoice) throw boom.notFound('Factura no encontrada para Veri*factu');

      // 2. Buscar el registro anterior para el encadenamiento
      const lastLog = await VerifactuLog.findOne({
        order: [['id', 'DESC']],
        transaction: t
      });

      const prevFingerprint = lastLog ? lastLog.fingerprint : null;

      // 3. Generar la huella (tu librería ya usa los 64 ceros si prevFingerprint es null)
      const fingerprint = generateVerifactuHash(invoice, prevFingerprint);

      // 4. Preparar el Payload
      const dateStr = invoice.postingDate instanceof Date
        ? invoice.postingDate.toISOString().split('T')[0]
        : invoice.postingDate;

      const payload = {
        emisor: {
          nif: (invoice.nif || '').trim().toUpperCase(),
          nombre: (invoice.name || '').trim()
        },
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

      // 5. INSERCIÓN DIRECTA (Usando los "field" del modelo)
      await sequelize.getQueryInterface().bulkInsert('verifactu_logs', [{
        invoice_code: invoice.code,
        fingerprint: fingerprint,
        prev_fingerprint: prevFingerprint,
        payload: JSON.stringify(payload),
        is_test: isTest,
        created_at: new Date()
      }], { transaction: t });

      if (!transaction) await t.commit();

      return { invoiceCode: invoice.code, fingerprint };

    } catch (error) {
      if (!transaction && t) await t.rollback();
      console.error("Error en Verifactu Log:", error);
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
