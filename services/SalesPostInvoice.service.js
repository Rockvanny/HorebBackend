const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const VerifactuService = require('./verifactulogs.service');
const ModuleConfigService = require('./moduleConfig.service');
const VerifactuConfigService = require('./verifactuConfig.service');
const VerifactuProviderClient = require('./verifactuProvider.client');
const { calculateDocumentTotals } = require('../libs/taxCalculation');

const {
  salesPostInvoice,
  salesPostInvoiceLine,
  Customer,
  DocumentTax // Tabla universal de impuestos
} = sequelize.models;

const verifactuService = new VerifactuService();
const moduleConfigService = new ModuleConfigService();
const verifactuConfigService = new VerifactuConfigService();
const verifactuProviderClient = new VerifactuProviderClient();

// Facturas rectificativas (abonos): ClaveTipoFacturaType R1-R5, ver
// resources/verifactu-xsd/SuministroInformacion.xsd. Se centraliza aquí
// porque tanto el filtro de listado (findPaginated) como cualquier otra
// consulta futura sobre "solo abonos" deben usar exactamente el mismo set.
const CREDIT_NOTE_TYPES = ['R1', 'R2', 'R3', 'R4', 'R5'];

class SalesPostInvoiceService {
  async findPaginated({ limit, offset, searchTerm, filter }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']],
      where: {}
    };

    // 'creditNotes': alimenta la página "Abonos de venta registrados" del
    // sidebar -misma tabla que las facturas registradas, filtrada por
    // typeInvoice (ver document-schema.mjs#salesCreditNotes). 'invoicesOnly'
    // es el complemento: alimenta "Facturas de venta registradas"
    // excluyendo los abonos, para que no aparezcan duplicados en ambas
    // páginas.
    if (filter === 'creditNotes') {
      options.where.typeInvoice = { [Op.in]: CREDIT_NOTE_TYPES };
    } else if (filter === 'invoicesOnly') {
      options.where.typeInvoice = { [Op.notIn]: CREDIT_NOTE_TYPES };
    }

    if (searchTerm) {
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { nif: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    try {
      const { count, rows } = await salesPostInvoice.findAndCountAll(options);
      return { records: rows, hasMore: (parsedOffset + rows.length) < count, total: count };
    } catch (error) {
      throw boom.badImplementation('Error al consultar histórico', error);
    }
  }

  async findOne(id, options = {}) {
    const { includeLines = false } = options;
    const isNumeric = !isNaN(id) && !isNaN(parseFloat(id));
    const queryOptions = {
      where: isNumeric ? { id } : { code: id },
      include: [{ model: DocumentTax, as: 'taxes' }]
    };

    if (includeLines) queryOptions.include.push({ model: salesPostInvoiceLine, as: 'lines' });

    const record = await salesPostInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura no encontrada');
    return record;
  }

  /**
   * Busca facturas registradas de un cliente específico.
   * Útil para rellenar el selector de "Factura a rectificar" (baseRectified).
   */
  async findByCustomer(entityCode) {
    if (!entityCode) {
      throw boom.badRequest('Se requiere el código del cliente');
    }

    try {
      const invoices = await salesPostInvoice.findAll({
        where: {
          entityCode: entityCode
          // Aquí podrías añadir filtros adicionales, ej: que no sean ya rectificativas
        },
        attributes: ['id', 'code', 'name', 'postingDate', 'amountWithVAT'],
        order: [['postingDate', 'DESC']]
      });

      return invoices;
    } catch (error) {
      throw boom.badImplementation('Error al consultar facturas por cliente', error);
    }
  }

  async create(data) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. RE-CALCULAR TODO antes de insertar
      const totals = calculateDocumentTotals(lines, headerData.movementId, 'salespostinvoices');

      // 2. Creación de Cabecera con totales recalculados
      const newPostInvoice = await salesPostInvoice.create({
        ...headerData,
        amountWithoutVAT: totals.headerTotals.amountWithoutVAT,
        amountVAT: totals.headerTotals.amountVAT,
        amountWithVAT: totals.headerTotals.amountWithVAT
      }, { transaction });

      // 3. Inserción de Líneas usando processedLines
      if (totals.processedLines && totals.processedLines.length > 0) {
        const rows = totals.processedLines.map((line) => {
          const base = parseFloat(line.amountLine) || 0;
          const porcentajeIVA = parseFloat(line.vat) || 0;
          const importeConIVA = base + (base * (porcentajeIVA / 100));

          return {
            code_document: newPostInvoice.code,
            line_no: line.lineNo,
            type: line.type || 'PRODUCTO',
            // Línea de presupuesto de origen (ver sales_invoice_lines.budget_line_no):
            // se hereda tal cual para poder calcular cuánto queda pendiente de
            // facturar contra el histórico definitivo.
            budget_line_no: line.budgetLineNo ?? null,
            item_code: line.codeItem || null,
            description: line.description || '',
            quantity: parseFloat(line.quantity) || 0,
            unit_measure: line.unitMeasure || 'UNIDAD',
            quantity_unit_measure: parseFloat(line.quantityUnitMeasure) || 1,
            // Antes se perdían al registrar: una factura con líneas en METRO2
            // llegaba al histórico definitivo sin ancho/alto.
            width: parseFloat(line.width) || 0,
            height: parseFloat(line.height) || 0,
            unit_price: parseFloat(line.unitPrice) || 0,
            tax_type: line.taxType || 'IVA',
            vat: porcentajeIVA,
            amount_line: importeConIVA,
            user_name: data.username || null,
            created_at: new Date(),
            updated_at: new Date()
          };
        });

        await sequelize.getQueryInterface().bulkInsert(
          'sales_post_invoice_lines',
          rows,
          { transaction }
        );
      }

      // 4. Actualización de impuestos y Verifactu
      await DocumentTax.update(
        { codeDocument: 'salespostinvoices' },
        { where: { movementId: newPostInvoice.movementId }, transaction }
      );

      // Veri*factu es un módulo activable (ver services/moduleConfig.service.js
      // y la tabla module_config): si está desactivado, la factura se registra
      // igual pero sin generar hash/XML/traza AEAT.
      let providerSubmission = null;
      if (await moduleConfigService.isEnabled('VERIFACTU')) {
        // isTest decide si el QR (y el envío a proveedor, más abajo) apunta
        // al entorno de pruebas o al de producción de la AEAT -antes iba
        // fijo a true, así que nunca se podía operar en producción real-.
        // Sin fila de configuración todavía, se mantiene en pruebas por
        // defecto.
        const verifactuConfig = await verifactuConfigService.getActiveConfig();
        const isTest = verifactuConfig?.isTest ?? true;
        const log = await verifactuService.createLog(newPostInvoice.code, isTest, transaction);

        if (verifactuConfig?.useProvider) {
          providerSubmission = { config: verifactuConfig, invoiceCode: newPostInvoice.code, payload: log.payload };
        }
      }
      await transaction.commit();

      // Envío al proveedor externo, si está activo: a propósito FUERA de la
      // transacción y sin esperar a que termine (fire-and-forget) -es una
      // llamada de red que puede tardar o fallar, y no debe bloquear la
      // respuesta ni deshacer el alta de la factura, que ya quedó registrada
      // localmente-. El resultado (aceptado/rechazado/error de conexión)
      // queda reflejado en el propio registro vía applyProviderResponse,
      // consultable en Registro Veri*factu.
      if (providerSubmission) {
        verifactuProviderClient.submit(providerSubmission.config, providerSubmission.payload)
          .catch((error) => ({ accepted: false, error: error.message }))
          .then((response) => verifactuService.applyProviderResponse(providerSubmission.invoiceCode, response))
          .catch((error) => console.error('[SalesPostInvoice] Error aplicando la respuesta del proveedor Veri*factu:', error.message));
      }

      return await this.findOne(newPostInvoice.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }
}

module.exports = SalesPostInvoiceService;
