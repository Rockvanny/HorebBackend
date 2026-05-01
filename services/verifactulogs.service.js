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

  async createLog(invoiceCode, isTest = false, transaction = null) {
    const t = transaction || await sequelize.transaction();
    try {
      // 1. Obtener los datos de la empresa (Emisor)
      // Buscamos el primer registro de la tabla company
      const company = await Company.findOne({ transaction: t });
      if (!company) throw boom.notFound('Configuración de empresa no encontrada para Veri*factu');

      // 2. Obtener los datos de la factura e incluir sus impuestos (taxes)
      const invoice = await salesPostInvoice.findOne({
        where: { code: invoiceCode },
        include: [{ model: DocumentTax, as: 'taxes' }],
        transaction: t
      });

      if (!invoice) throw boom.notFound('Factura no encontrada para Veri*factu');

      // 3. Buscar el registro anterior para el encadenamiento
      const lastLog = await VerifactuLog.findOne({
        order: [['id', 'DESC']],
        transaction: t
      });

      const prevFingerprint = lastLog ? lastLog.fingerprint : null;

      // 4. Generar la huella (Hash)
      const fingerprint = generateVerifactuHash(invoice, prevFingerprint);

      // 5. Preparar el Payload
      const dateStr = invoice.postingDate instanceof Date
        ? invoice.postingDate.toISOString().split('T')[0]
        : invoice.postingDate;

      const payload = {
        sistema_informatico: {
          nombre: "HOREB",
          version: "1.0.0",
          nif_desarrollador: "B12345678"
        },
        tipo_registro: "ALTA",
        timestamp: new Date().toISOString(),
        emisor: {
          nif: (company.vatRegistration || '').trim().toUpperCase(),
          nombre: (company.name || '').trim()
        },
        factura: {
          numero_serie: invoice.code,
          fecha_emision: dateStr,
          tipo_factura: invoice.typeInvoice || 'F1',
          importe_total: parseFloat(invoice.amountWithVAT || 0).toFixed(2),
          desglose: (invoice.taxes || []).map(tax => ({
            tipo_impuesto: tax.taxType,
            base_imponible: parseFloat(tax.taxableAmount).toFixed(2),
            tipo_impositivo: parseFloat(tax.taxPercentage).toFixed(2),
            cuota_repercutida: parseFloat(tax.taxAmount).toFixed(2)
          }))
        },
        encadenamiento: {
          huella_anterior: prevFingerprint || "0".repeat(64)
        }
      };

      // 6. Generar la cadena del QR
      const qrData = this.generateQRText(payload, fingerprint);

      // 7. INSERCIÓN DIRECTA
      // Nota: No incluimos 'is_test' dentro del JSON de 'payload' para evitar errores en AEAT,
      // pero lo guardamos en la columna 'is_test' de la tabla.
      await sequelize.getQueryInterface().bulkInsert('verifactu_logs', [{
        invoice_code: invoice.code,
        fingerprint: fingerprint,
        prev_fingerprint: prevFingerprint,
        qr_data: qrData,
        payload: JSON.stringify(payload), // El objeto ya no lleva is_test dentro
        is_test: isTest,
        created_at: new Date()
      }], { transaction: t });

      if (!transaction) await t.commit();

      return {
        invoiceCode: invoice.code,
        fingerprint,
        qrData
      };

    } catch (error) {
      if (!transaction && t) await t.rollback();
      console.error("Error en Verifactu Log:", error);
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

  async findPaginated(query) {
    const { limit = 10, offset = 0, isTest, invoiceCode } = query;
    const where = {};
    if (isTest !== undefined) where.isTest = isTest;
    if (invoiceCode) where.invoiceCode = { [Op.iLike]: `%${invoiceCode}%` };

    const { count, rows } = await VerifactuLog.findAndCountAll({
      where,
      limit,
      offset,
      order: [['id', 'DESC']]
    });

    return { total: count, data: rows };
  }
}

module.exports = VerifactuService;
