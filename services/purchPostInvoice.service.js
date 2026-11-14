// services/purchPostInvoice.service.js
const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { parsePagination } = require('../libs/pagination');
const { CREDIT_NOTE_TYPES } = require('../libs/invoiceTypes');
const sequelize = require('../libs/sequelize');
const { calculateDocumentTotals } = require('../libs/taxCalculation');
const UtilsService = require('../services/util.service');

const {
  purchPostInvoice,
  purchPostInvoiceLine,
  DocumentTax // Tabla universal de impuestos
} = sequelize.models;

// Facturas rectificativas (abonos): ClaveTipoFacturaType R1-R5, ver
// resources/verifactu-xsd/SuministroInformacion.xsd. Mismo criterio que
// libs/invoiceTypes.js.

class PurchPostInvoiceService {
  async findPaginated({ limit, offset, searchTerm, filter }) {
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(limit, offset);

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']],
      where: {}
    };

    // 'creditNotes': alimenta la página "Abonos de compra registrados" del
    // sidebar -misma tabla que las facturas registradas, filtrada por
    // typeInvoice (ver document-schema.mjs#purchCreditNotes). 'invoicesOnly'
    // es el complemento: alimenta "Facturas de compra registradas"
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
      const { count, rows } = await purchPostInvoice.findAndCountAll(options);
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

    if (includeLines) queryOptions.include.push({ model: purchPostInvoiceLine, as: 'lines' });

    const record = await purchPostInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura no encontrada');
    return record;
  }

  /**
   * Busca facturas registradas de un proveedor específico.
   * Útil para rellenar el selector de "Factura a rectificar" (Espejo de findByCustomer).
   */
  /**
   * Anulación interna de una factura (o abono) de compra registrada. Las
   * compras no van a Veri*factu: si una se registró por error (p. ej. un
   * gasto operativo metido como compra) no se inventa un abono del
   * proveedor, se anula. Solo administradores (ver router). No se borra:
   * queda con fecha, usuario y motivo, y deja de contar en estadísticas,
   * saldos del proveedor, el Excel y el selector de factura origen.
   */
  async void(code, reason, userCode) {
    const invoice = await purchPostInvoice.findOne({ where: { code } });
    if (!invoice) throw boom.notFound('Factura no encontrada');
    if (invoice.voidedAt) throw boom.conflict('La factura ya está anulada.');

    await invoice.update({ voidedAt: new Date(), voidedBy: userCode, voidReason: reason });
    return invoice;
  }

  async findByVendor(entityCode) {
    if (!entityCode) {
      throw boom.badRequest('Se requiere el código del proveedor');
    }

    try {
      const invoices = await purchPostInvoice.findAll({
        // Solo facturas (F1/F2) no anuladas: un abono corrige una factura, no
        // otro abono, y una anulada no se puede elegir como factura origen.
        where: {
          entityCode: entityCode,
          typeInvoice: { [Op.notIn]: CREDIT_NOTE_TYPES },
          voidedAt: null
        },
        attributes: ['id', 'code', 'name', 'postingDate', 'amountWithVAT'],
        order: [['postingDate', 'DESC']]
      });

      return invoices;
    } catch (error) {
      throw boom.badImplementation('Error al consultar facturas por proveedor', error);
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
      const totals = calculateDocumentTotals(lines, headerData.movementId, 'purchpostinvoices');

      // 2. Creación de Cabecera con totales recalculados
      const newPostInvoice = await purchPostInvoice.create({
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
            item_code: line.codeItem || null,
            description: line.description || '',
            quantity: parseFloat(line.quantity) || 0,
            unit_measure: line.unitMeasure || 'UNIDAD',
            quantity_unit_measure: parseFloat(line.quantityUnitMeasure) || 1,
            // Antes se perdían al registrar: una factura con líneas en
            // METRO2 llegaba al histórico definitivo sin ancho/alto (mismo
            // bug que tenía salesPostInvoice.service.js).
            width: parseFloat(line.width) || 0,
            height: parseFloat(line.height) || 0,
            unit_price: parseFloat(line.unitPrice) || 0,
            tax_type: line.taxType || 'IVA',
            // Retención opcional (ya normalizada por calculateDocumentTotals)
            withholding_type: line.withholdingType || null,
            withholding_percentage: line.withholdingPercentage ?? null,
            vat: porcentajeIVA,
            amount_line: importeConIVA,
            user_name: data.username || data.userName || null, // Soporta ambas variantes de propiedad de auditoría
            created_at: new Date(),
            updated_at: new Date()
          };
        });

        await sequelize.getQueryInterface().bulkInsert(
          'purch_post_invoice_lines',
          rows,
          { transaction }
        );
      }

      // 4. Actualización de impuestos
      // Camino normal: reclasificamos las filas de DocumentTax que ya creó el
      // borrador (mismo movementId) en vez de duplicarlas -conserva su id/
      // created_at-. Pero si no había ninguna fila que reclasificar (ej. un
      // registro creado sin pasar por la creación normal del borrador), el
      // histórico se quedaba para siempre sin desglose de impuestos aunque
      // las líneas sí tuvieran IVA -confirmado en producción, mismo bug que
      // en salesPostInvoice.service.js-: si el UPDATE no tocó ninguna fila,
      // se insertan aquí mismo las ya calculadas en `totals.taxesToInsert`.
      const [reclassified] = await DocumentTax.update(
        { codeDocument: 'purchpostinvoices' },
        { where: { movementId: newPostInvoice.movementId }, transaction }
      );
      if (reclassified === 0 && totals.taxesToInsert && totals.taxesToInsert.length > 0) {
        await DocumentTax.bulkCreate(totals.taxesToInsert, { transaction });
      }

      if (!ownsTransaction) return newPostInvoice;

      await transaction.commit();

      // Sincronizado para retornar la búsqueda usando el '.code' de forma idéntica a ventas
      return await this.findOne(newPostInvoice.code, { includeLines: true });

    } catch (error) {
      if (ownsTransaction) await transaction.rollback();
      throw error;
    }
  }

  /**
 * Obtiene y desglosa las facturas de compra registradas dentro de un rango de fechas.
 * Diseñado para alimentar el reporte de Control de Gastos.
 */
  async findForReport(startDate, endDate) {
    try {
      // 1. Obtener facturas con sus impuestos asociados
      // Usamos el alias 'taxes' definido en el modelo
      const invoices = await purchPostInvoice.findAll({
        // Las anuladas no van al Excel de la asesoría
        where: {
          posting_date: {
            [Op.between]: [startDate, endDate]
          },
          voidedAt: null
        },
        include: [{
          model: DocumentTax,
          as: 'taxes'
        }],
        order: [['postingDate', 'ASC']]
      });

      // 2. Transformación de datos para el reporte
      return invoices.map(invoice => {
        // Acceso defensivo: si no hay impuestos, usamos 0 por defecto
        const taxes = Array.isArray(invoice.taxes) ? invoice.taxes : [];
        const taxDetail = taxes.length > 0 ? taxes[0] : { taxPercentage: 0 };

        return {
          fecha: invoice.postingDate ? new Date(invoice.postingDate).toLocaleDateString('es-ES') : '',
          numeroFactura: invoice.code || '',
          proveedor: invoice.name || '',
          cif: invoice.nif || '',
          concepto: invoice.comments || 'COMPRA REGISTRADA',
          importe: parseFloat(invoice.amountWithoutVAT || 0),
          ivaPorcentaje: parseFloat(taxDetail.taxPercentage || 0)
        };
      });

    } catch (error) {
      throw error;
    }
  }
}

module.exports = PurchPostInvoiceService;
