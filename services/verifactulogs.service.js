const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const generateVerifactuHash = require('../libs/hasInvoice');
const { toFechaAEAT, toFechaHoraHusoAEAT } = require('../libs/verifactuDates');
const { getMachineFingerprint } = require('../libs/fingerprint');

const { VerifactuLog, salesPostInvoice, salesPostInvoiceLine, DocumentTax, Company } = sequelize.models;

// Identidad del sistema informático (SistemaInformatico en el XML): quién
// desarrolla el software, no la empresa que factura. Ver
// resources/verifactu-xsd/SuministroInformacion.xsd#SistemaInformaticoType.
const SISTEMA_INFORMATICO = {
  nombreRazon: 'HOREB',
  nif: '55821164A',
  nombreSistemaInformatico: 'HOREB',
  idSistemaInformatico: '01',
  version: '1.0.0',
};

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

    // payload.idFactura.fechaExpedicionFactura ya está en DD-MM-YYYY (ver
    // libs/verifactuDates.js), el mismo formato que exige el QR -no hace
    // falta reformatear nada aquí-.
    const params = new URLSearchParams({
      nif: payload.idFactura.idEmisorFactura,
      numserie: payload.idFactura.numSerieFactura,
      fecha: payload.idFactura.fechaExpedicionFactura,
      importe: payload.importeTotal
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

  /**
   * `payload` refleja 1:1 la estructura real de RegistroFacturacionAltaType
   * (ver resources/verifactu-xsd/SuministroInformacion.xsd), para que
   * VerifactuXml.service.js pueda volcarlo al XML sin reinterpretar nada.
   */
  async createLog(invoiceCode, isTest = false, transaction = null) {
    const t = transaction || await sequelize.transaction();
    try {
      const company = await Company.findOne({ transaction: t });
      if (!company) throw boom.notFound('Configuración de empresa no encontrada');

      const invoice = await salesPostInvoice.findOne({
        where: { code: invoiceCode },
        include: [
          { model: DocumentTax, as: 'taxes' },
          { model: salesPostInvoiceLine, as: 'lines' }
        ],
        transaction: t
      });

      if (!invoice) throw boom.notFound('Factura no encontrada');

      const lastLog = await VerifactuLog.findOne({
        order: [['id', 'DESC']],
        transaction: t
      });

      const nif = (company.vatRegistration || '').trim().toUpperCase();
      const fechaExpedicionFactura = toFechaAEAT(invoice.postingDate);
      const fechaHoraHusoGenRegistro = toFechaHoraHusoAEAT();
      const tipoFactura = invoice.typeInvoice || 'F1';
      const cuotaTotal = parseFloat(invoice.amountVAT || 0).toFixed(2);
      const importeTotal = parseFloat(invoice.amountWithVAT || 0).toFixed(2);
      const prevFingerprint = lastLog ? lastLog.fingerprint : null;

      // Huella: algoritmo oficial exacto (ver libs/hasInvoice.js), verificado
      // contra los ejemplos publicados por la AEAT. huellaAnterior vacía (no
      // "0" repetido) si es el primer registro de la cadena -así lo exige la
      // especificación-.
      const fingerprint = generateVerifactuHash({
        idEmisorFactura: nif,
        numSerieFactura: invoice.code,
        fechaExpedicionFactura,
        tipoFactura,
        cuotaTotal,
        importeTotal,
        huellaAnterior: prevFingerprint || '',
        fechaHoraHusoGenRegistro,
      });

      // Encadenamiento: el primer registro de la cadena no tiene "registro
      // anterior" (PrimerRegistro="S", ver RegistroFacturacionAltaType); el
      // resto referencia NIF/serie/fecha/huella del registro justo anterior.
      // La fecha se recupera del propio payload guardado en su momento (no
      // hay que volver a consultar esa factura anterior).
      const encadenamiento = lastLog
        ? {
          registroAnterior: {
            idEmisorFactura: nif,
            numSerieFactura: lastLog.invoiceCode,
            fechaExpedicionFactura: lastLog.payload?.idFactura?.fechaExpedicionFactura || fechaExpedicionFactura,
            huella: lastLog.fingerprint,
          }
        }
        : { primerRegistro: 'S' };

      // DescripcionOperacion es obligatorio y no hay un campo de "descripción
      // de la operación" propio en la cabecera de la factura: se construye a
      // partir de las líneas (mejor esfuerzo, revisable) o de las notas, con
      // un texto genérico como último recurso.
      const descripcionOperacion = (
        (invoice.lines || []).map((line) => line.description).filter(Boolean).join('; ')
        || invoice.comments
        || `Factura ${invoice.code}`
      ).trim().slice(0, 500);

      const taxLines = invoice.taxes && invoice.taxes.length > 0
        ? invoice.taxes
        : [{ taxPercentage: 21, taxableAmount: invoice.amountWithoutVAT || 0, taxAmount: invoice.amountVAT || 0 }];

      const payload = {
        idVersion: '1.0',
        idFactura: {
          idEmisorFactura: nif,
          numSerieFactura: invoice.code,
          fechaExpedicionFactura,
        },
        nombreRazonEmisor: (company.name || '').trim(),
        tipoFactura,
        descripcionOperacion,
        // Impuesto "01" (IVA) y CalificacionOperacion "S1" (sujeta y no
        // exenta, sin inversión del sujeto pasivo): el caso general de una
        // venta nacional con IVA repercutido -no cubre exportaciones,
        // operaciones exentas ni inversión del sujeto pasivo-.
        desglose: taxLines.map((tax) => ({
          impuesto: '01',
          calificacionOperacion: 'S1',
          tipoImpositivo: parseFloat(tax.taxPercentage || 0).toFixed(2),
          baseImponibleOimporteNoSujeto: parseFloat(tax.taxableAmount ?? tax.taxBase ?? 0).toFixed(2),
          cuotaRepercutida: parseFloat(tax.taxAmount || 0).toFixed(2),
        })),
        cuotaTotal,
        importeTotal,
        encadenamiento,
        sistemaInformatico: {
          ...SISTEMA_INFORMATICO,
          // Identificador estable de esta instalación (mismo que ata la
          // licencia, ver libs/fingerprint.js) -no hay un "número de
          // instalación" registrado en la AEAT todavía, es el mejor
          // identificador real disponible-.
          numeroInstalacion: getMachineFingerprint().slice(0, 100),
          // Este sistema admite operar sin transmitir en tiempo real (modo
          // local, ver services/verifactuConfig.service.js), así que no es
          // "exclusivamente Veri*factu".
          tipoUsoPosibleSoloVerifactu: 'N',
          tipoUsoPosibleMultiOT: 'N',
          indicadorMultiplesOT: 'N',
        },
        fechaHoraHusoGenRegistro,
        tipoHuella: '01',
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
        createdAt: new Date()
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
