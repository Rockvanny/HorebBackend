// services/purchPostInvoice.service.js
const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { calculateDocumentTotals } = require('../libs/taxCalculation');
const UtilsService = require('../services/util.service');

const {
  purchPostInvoice,
  purchPostInvoiceLine,
  DocumentTax // Tabla universal de impuestos
} = sequelize.models;

class PurchPostInvoiceService {
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']],
      where: {}
    };

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
  async findByVendor(entityCode) {
    if (!entityCode) {
      throw boom.badRequest('Se requiere el código del proveedor');
    }

    try {
      const invoices = await purchPostInvoice.findAll({
        where: {
          entityCode: entityCode
        },
        attributes: ['id', 'code', 'name', 'postingDate', 'amountWithVAT'],
        order: [['postingDate', 'DESC']]
      });

      return invoices;
    } catch (error) {
      throw boom.badImplementation('Error al consultar facturas por proveedor', error);
    }
  }

  async create(data) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();

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
          const base = parseFloat(line.amountLine) || 0;
          const porcentajeIVA = parseFloat(line.vat) || 0;
          const importeConIVA = base + (base * (porcentajeIVA / 100));

          return {
            code_document: newPostInvoice.code,
            line_no: line.lineNo,
            item_code: line.codeItem || null,
            description: line.description || '',
            quantity: parseFloat(line.quantity) || 0,
            unit_measure: line.unitMeasure || 'UNIDAD',
            quantity_unit_measure: parseFloat(line.quantityUnitMeasure) || 1,
            unit_price: parseFloat(line.unitPrice) || 0,
            tax_type: line.taxType || 'IVA',
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
      await DocumentTax.update(
        { codeDocument: 'purchpostinvoices' },
        { where: { movementId: newPostInvoice.movementId }, transaction }
      );

      await transaction.commit();

      // Sincronizado para retornar la búsqueda usando el '.code' de forma idéntica a ventas
      return await this.findOne(newPostInvoice.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
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
        where: {
          posting_date: {
            [Op.between]: [startDate, endDate]
          }
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
      console.error("[PurchPostInvoiceService] Error en findForReport:", error);
      throw error;
    }
  }
}

module.exports = PurchPostInvoiceService;
