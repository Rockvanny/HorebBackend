const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const generateVerifactuHash = require('../libs/hasInvoice');

const { VerifactuLog, salesPostInvoice, DocumentTax, Company } = sequelize.models;

class VerifactuService {
  constructor() { }

  /**
   * Genera la URL del código QR según el estándar Veri*factu de la AEAT
   * (Orden HAC/1177/2024): host de pruebas o producción según `isTest`,
   * parámetros nif/numserie/fecha/importe -sin "huella", que no forma parte
   * del QR público, la AEAT la casa internamente con el registro recibido-.
   */
  generateQRText(payload, isTest = false) {
    const baseUrl = isTest
      ? "https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR"
      : "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR";

    // payload.factura.fecha_emision se guarda en ISO (YYYY-MM-DD) para el
    // XML/auditoría; la AEAT exige DD-MM-YYYY en el QR, así que se
    // reformatea solo aquí, sin tocar el payload persistido.
    const [year, month, day] = String(payload.factura.fecha_emision).split('-');
    const fechaQR = (year && month && day) ? `${day}-${month}-${year}` : payload.factura.fecha_emision;

    const params = new URLSearchParams({
      nif: payload.emisor.nif,
      numserie: payload.factura.numero_serie,
      fecha: fechaQR,
      importe: payload.factura.importe_total
    });
    return `${baseUrl}?${params.toString()}`;
  }

  async findOne(id) {
    // Usamos findOne con where porque 'id' puede ser el invoiceCode (String)
    const log = await VerifactuLog.findOne({
      where: {
        // Intentamos buscar por invoiceCode si es un string como "FVR027"
        invoiceCode: id
      },
      include: [{
        model: salesPostInvoice,
        as: 'invoice',
        attributes: ['code', 'amountWithVAT', 'postingDate']
      }]
    });

    if (!log) {
      throw boom.notFound('Registro de Veri*factu no encontrado');
    }
    return log;
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

      const qrData = this.generateQRText(payload, isTest);

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

  /**
     * ACTUALIZAR REFERENCIA EXTERNA
     * @param {Number} id - ID del log
     * @param {Object} changes - Objeto con externalReference
     */
    async update(id, changes) {
        const log = await this.findOne(id);

        // Seguridad: Solo permitimos actualizar la referencia externa.
        // El resto de campos (fingerprint, payload, etc.) son inmutables.
        const updateData = {
            externalReference: changes.externalReference
        };
        // Anotar el CSV/referencia a mano (modo local) es, en la práctica,
        // la confirmación de que la AEAT aceptó el registro.
        if (changes.externalReference) updateData.status = 'accepted';

        const updatedLog = await log.update(updateData);
        return updatedLog;
    }

  /**
   * Punto de enganche para cuando se integre un proveedor Veri*factu
   * externo (hoy "Usar proveedor externo" en Configuración Veri*factu solo
   * guarda las credenciales, no dispara ningún envío real -ver
   * services/salesPostInvoice.service.js-). Cuando exista esa integración,
   * bastará con llamar aquí con la respuesta del proveedor tal cual llegue;
   * no debería hacer falta tocar el esquema de nuevo.
   *
   * `response` es deliberadamente genérico (se ajustará al shape real del
   * proveedor elegido):
   *   - accepted: boolean
   *   - externalReference: string, CSV/ID de recepción
   *   - qrData: string, opcional -si el proveedor calcula su propio QR,
   *     prevalece sobre el generado localmente-
   *   - error: string, motivo si fue rechazado
   */
  async applyProviderResponse(invoiceCode, response = {}) {
    const log = await VerifactuLog.findOne({ where: { invoiceCode } });
    if (!log) throw boom.notFound('Registro de Veri*factu no encontrado');

    const status = response.accepted ? 'accepted' : (response.error ? 'rejected' : 'sent');

    return await log.update({
      status,
      providerResponse: response,
      providerError: response.error || null,
      externalReference: response.externalReference || log.externalReference,
      qrData: response.qrData || log.qrData,
      submittedAt: log.submittedAt || new Date(),
    });
  }

  async getTraceability(invoiceCode) {
    const log = await VerifactuLog.findOne({
      where: { invoiceCode },
      include: ['invoice']
    });
    if (!log) throw boom.notFound('Registro Veri*factu no encontrado');
    return log;
  }

  /**
   * Marca cuándo se descargó el XML exportable (modo 'local', ver
   * services/verifactuConfig.service.js). Deja constancia de qué facturas
   * ya se subieron a mano a la plataforma de la AEAT y cuáles siguen
   * pendientes.
   */
  async markExported(invoiceCode) {
    const log = await this.findOne(invoiceCode);
    return await log.update({
      exportedAt: new Date(),
      submittedAt: log.submittedAt || new Date(),
      // Si ya estaba aceptado (externalReference ya anotado a mano) no lo
      // retrocedemos a 'sent' solo por volver a descargar el XML.
      status: log.status === 'accepted' ? log.status : 'sent',
    });
  }
}

module.exports = VerifactuService;
