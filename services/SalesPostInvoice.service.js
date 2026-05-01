const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const VerifactuService = require('./verifactulogs.service');
const { calculateDocumentTotals } = require('../libs/taxCalculation');

const {
  salesPostInvoice,
  salesPostInvoiceLine,
  Customer,
  DocumentTax // Tabla universal de impuestos
} = sequelize.models;

const verifactuService = new VerifactuService();

class SalesPostInvoiceService {
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

  async create(data) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. RE-CALCULAR TODO antes de insertar (Seguridad del lado del servidor)
      // Esto asegura que amount_line incluya el IVA si así lo decides,
      // o al menos que los totales de cabecera sean verídicos.
      const totals = calculateDocumentTotals(lines, headerData.movementId, 'salespostinvoices');

      // 2. Creación de Cabecera con totales recalculados
      const newPostInvoice = await salesPostInvoice.create({
        ...headerData,
        amountWithoutVAT: totals.headerTotals.amountWithoutVAT,
        amountVAT: totals.headerTotals.amountVAT,
        amountWithVAT: totals.headerTotals.amountWithVAT
      }, { transaction });

      // 3. Inserción de Líneas usando processedLines (las que salieron del cálculo)
      if (totals.processedLines && totals.processedLines.length > 0) {
        const rows = totals.processedLines.map((line) => {
          // Calculamos el importe con IVA para que amount_line sea el "Total Real"
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
            // AQUÍ LA CLAVE: Guardamos el importe CON IVA para que coincida con la App
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

      // 4. Actualización de impuestos y Verifactu (se mantiene igual)
      await DocumentTax.update(
        { codeDocument: 'salespostinvoices' },
        { where: { movementId: newPostInvoice.movementId }, transaction }
      );

      await verifactuService.createLog(newPostInvoice.code, true, transaction);
      await transaction.commit();

      return await this.findOne(newPostInvoice.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }
}

module.exports = SalesPostInvoiceService;
