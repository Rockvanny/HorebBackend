const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const generateVerifactuHash = require('../libs/hasInvoice');

const { VerifactuLog, salesPostInvoice, DocumentTax, Company } = sequelize.models;

class VerifactuService {
  constructor() { }

  /**
   * Genera la URL del código QR según el estándar Veri*factu de la AEAT
   */
  generateQRText(payload, fingerprint) {
    const baseUrl = "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/v1/qr";
    const params = new URLSearchParams({
      nif: payload.emisor.nif,
      numserie: payload.factura.numero_serie,
      fecha: payload.factura.fecha_emision,
      importe: payload.factura.importe_total,
      huella: fingerprint
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * PAGINACIÓN PARA EXPLORER
   */
  async findPaginated(query) {
    const { limit, offset, searchTerm, isTest } = query;

    const parsedLimit = parseInt(limit, 10) || 50;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']],
      where: {},
      include: [{
        model: salesPostInvoice,
        as: 'invoice',
        attributes: ['code', 'amountWithVAT']
      }]
    };

    // Filtros dinámicos
    if (isTest !== undefined) {
      options.where.isTest = isTest === 'true';
    }

    if (searchTerm) {
      options.where[Op.or] = [
        { invoiceCode: { [Op.iLike]: `%${searchTerm}%` } },
        { externalReference: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    try {
      const { count, rows } = await VerifactuLog.findAndCountAll(options);

      return {
        records: rows,
        total: count,
        hasMore: (parsedOffset + rows.length) < count
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar registros de Verifactu', error);
    }
  }

  async createLog(invoiceCode, isTest = false, transaction = null) {
    const t = transaction || await sequelize.transaction();
    try {
      const company = await Company.findOne({ transaction: t });
      if (!company) throw boom.notFound('Configuración de empresa no encontrada');

      const invoice = await salesPostInvoice.findOne({
        where: { code: invoiceCode },
        include: [{ model: DocumentTax, as: 'taxes' }],
        transaction: t
      });

      if (!invoice) throw boom.notFound('Factura no encontrada');

      const lastLog = await VerifactuLog.findOne({
        order: [['id', 'DESC']],
        transaction: t
      });

      const prevFingerprint = lastLog ? lastLog.fingerprint : null;
      const fingerprint = generateVerifactuHash(invoice, prevFingerprint);
      const now = new Date();

      const dateStr = invoice.postingDate instanceof Date
        ? invoice.postingDate.toISOString().split('T')[0]
        : invoice.postingDate;

      const payload = {
        sistema_informatico: {
          nombre: "HOREB",
          version: "1.0.0",
          nif_desarrollador: "55821164A"
        },
        tipo_registro: "ALTA",
        timestamp: now.toISOString(),
        emisor: {
          nif: (company.vatRegistration || '').trim().toUpperCase(),
          nombre: (company.name || '').trim()
        },
        factura: {
          numero_serie: invoice.code,
          fecha_emision: dateStr,
          hora_expedicion: now.toTimeString().split(' ')[0],
          tipo_factura: invoice.typeInvoice || 'F1',
          cuota_total: parseFloat(invoice.taxAmount || 0).toFixed(2),
          importe_total: parseFloat(invoice.amountWithVAT || 0).toFixed(2),
          desglose: (invoice.taxes || []).map(tax => ({
            clave_regimen: "01",
            tipo_impuesto: tax.taxType || "IVA",
            base_imponible: parseFloat(tax.taxableAmount).toFixed(2),
            tipo_impositivo: parseFloat(tax.taxPercentage).toFixed(2),
            cuota_repercutida: parseFloat(tax.taxAmount).toFixed(2)
          }))
        },
        encadenamiento: {
          huella_anterior: prevFingerprint || "0".repeat(64)
        }
      };

      const qrData = this.generateQRText(payload, fingerprint);

      // Inserción usando el modelo para aprovechar las asociaciones
      const newLog = await VerifactuLog.create({
        invoiceCode: invoice.code,
        fingerprint: fingerprint,
        prevFingerprint: prevFingerprint,
        qrData: qrData,
        payload: payload, // Sequelize manejará el JSONB
        isTest: isTest,
        createdAt: now
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
      include: ['invoice']
    });
    if (!log) throw boom.notFound('Registro Veri*factu no encontrado');
    return log;
  }
}

module.exports = VerifactuService;
