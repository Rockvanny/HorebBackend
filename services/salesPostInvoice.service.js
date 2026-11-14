const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { parsePagination } = require('../libs/pagination');
const { CREDIT_NOTE_TYPES } = require('../libs/invoiceTypes');
const sequelize = require('../libs/sequelize');
const VerifactuService = require('./verifactulogs.service');
const ModuleConfigService = require('./moduleConfig.service');
const VerifactuConfigService = require('./verifactuConfig.service');
const VerifactuProviderClient = require('./verifactuProvider.client');
const { calculateDocumentTotals } = require('../libs/taxCalculation');
const logger = require('../libs/logger');

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

class SalesPostInvoiceService {
  async findPaginated({ limit, offset, searchTerm, filter }) {
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(limit, offset);

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
   * Líneas de una factura registrada que aún se pueden abonar (selector de
   * líneas al crear un abono, ver fields-salesinvoice-handler.js
   * #invoiceLinesPicker). Por IMPORTE de la línea (con IVA), no por
   * cantidad: muchos abonos son descuentos sobre la misma cantidad.
   * Abonado = suma de las líneas de abonos (registrados y en borrador) que
   * apuntan a esa línea (parentCode + parentLineNo). Los abonos anteriores a
   * parent_line_no no se pueden atribuir a una línea y no cuentan.
   */
  async getCreditableLines(code) {
    const { salesInvoice, salesInvoiceLine } = sequelize.models;
    const invoice = await this.findOne(code, { includeLines: true });

    const credited = {};
    const add = (rows) => rows.forEach(r => {
      credited[r.parentLineNo] = (credited[r.parentLineNo] || 0) + Math.abs(parseFloat(r.amountLine) || 0);
    });
    const byParent = (model, as) => ({
      attributes: ['parentLineNo', 'amountLine'],
      where: { parentLineNo: { [Op.ne]: null } },
      include: [{
        model, as, attributes: [], required: true,
        where: { parentCode: invoice.code, typeInvoice: { [Op.in]: CREDIT_NOTE_TYPES } }
      }]
    });
    add(await salesPostInvoiceLine.findAll(byParent(salesPostInvoice, 'parentDocument')));
    add(await salesInvoiceLine.findAll(byParent(salesInvoice, 'parentDocument')));

    const round = (n) => Math.round(n * 100) / 100;
    return (invoice.lines || [])
      .map(line => {
        const plain = line.get({ plain: true });
        const total = Math.abs(parseFloat(plain.amountLine) || 0);
        const creditedAmount = round(credited[plain.lineNo] || 0);
        return { ...plain, creditedAmount, pendingAmount: round(Math.max(0, total - creditedAmount)) };
      })
      .sort((a, b) => a.lineNo - b.lineNo);
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
        // Solo facturas (F1/F2): un abono corrige una factura, no otro abono
        // (mismo criterio que la lista, ver findPaginated 'invoicesOnly').
        where: {
          entityCode: entityCode,
          typeInvoice: { [Op.notIn]: CREDIT_NOTE_TYPES }
        },
        attributes: ['id', 'code', 'name', 'postingDate', 'amountWithVAT'],
        order: [['postingDate', 'DESC']]
      });

      return invoices;
    } catch (error) {
      throw boom.badImplementation('Error al consultar facturas por cliente', error);
    }
  }

  /**
   * Crea la factura registrada. Con `options.transaction` (registro de un
   * borrador, ver *Invoice(s).service.js#archiveInvoice) trabaja dentro de
   * esa transacción y NO la confirma: quien llama borra el borrador en la
   * misma transacción, así todo el registro es atómico. Sin ella, abre y
   * confirma la suya como antes.
   */
  async create(data, { transaction: outerTransaction } = {}) {
    const { lines, ...headerData } = data;
    const ownsTransaction = !outerTransaction;
    const transaction = outerTransaction || await sequelize.transaction();

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
          const porcentajeIVA = parseFloat(line.vat) || 0;
          // calculateDocumentTotals ya devuelve en amountLine el importe final
          // de la línea (base +IVA / -IRPF). Antes se trataba como base y se
          // le volvía a sumar el IVA, así que la línea registrada (y la
          // impresa) salía inflada y no cuadraba con el total de cabecera.
          const importeConIVA = parseFloat(line.amountLine) || 0;

          return {
            code_document: newPostInvoice.code,
            line_no: line.lineNo,
            type: line.type || 'PRODUCTO',
            // Línea de presupuesto de origen (ver sales_invoice_lines.budget_line_no):
            // se hereda tal cual para poder calcular cuánto queda pendiente de
            // facturar contra el histórico definitivo.
            budget_line_no: line.budgetLineNo ?? null,
            // En abonos: línea de la factura origen que corrige
            parent_line_no: line.parentLineNo ?? null,
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
            // Retención opcional (ya normalizada por calculateDocumentTotals)
            withholding_type: line.withholdingType || null,
            withholding_percentage: line.withholdingPercentage ?? null,
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
      // Camino normal: reclasificamos las filas de DocumentTax que ya creó el
      // borrador (mismo movementId) en vez de duplicarlas -conserva su id/
      // created_at-. Pero si no había ninguna fila que reclasificar (ej. un
      // registro creado sin pasar por la creación normal del borrador), el
      // histórico se quedaba para siempre sin desglose de impuestos aunque
      // las líneas sí tuvieran IVA -confirmado en producción-: si el UPDATE
      // no tocó ninguna fila, se insertan aquí mismo las ya calculadas en
      // `totals.taxesToInsert`, para que el histórico nunca dependa de que
      // el borrador previo hiciera bien su parte.
      const [reclassified] = await DocumentTax.update(
        { codeDocument: 'salespostinvoices' },
        { where: { movementId: newPostInvoice.movementId }, transaction }
      );
      if (reclassified === 0 && totals.taxesToInsert && totals.taxesToInsert.length > 0) {
        await DocumentTax.bulkCreate(totals.taxesToInsert, { transaction });
      }

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

      // Envío al proveedor externo, si está activo: SOLO cuando la
      // transacción se confirma (afterCommit; con transacción externa, la
      // del registro completo) y sin esperar a que termine (fire-and-forget)
      // -es una llamada de red que puede tardar o fallar, y no debe bloquear
      // la respuesta ni deshacer el alta de la factura-. Si la transacción
      // se deshace, no se envía nada. El resultado queda en el propio
      // registro vía applyProviderResponse, consultable en Registro Veri*factu.
      if (providerSubmission) {
        transaction.afterCommit(() => {
          verifactuProviderClient.submit(providerSubmission.config, providerSubmission.payload)
            .catch((error) => ({ accepted: false, error: error.message }))
            .then((response) => verifactuService.applyProviderResponse(providerSubmission.invoiceCode, response))
            .catch((error) => logger.error(`SalesPostInvoice: no se pudo guardar la respuesta del proveedor Veri*factu: ${error.message}`, { stack: error.stack }));
        });
      }

      if (!ownsTransaction) return newPostInvoice;

      await transaction.commit();
      return await this.findOne(newPostInvoice.code, { includeLines: true });

    } catch (error) {
      if (ownsTransaction) await transaction.rollback();
      throw error;
    }
  }
}

module.exports = SalesPostInvoiceService;
