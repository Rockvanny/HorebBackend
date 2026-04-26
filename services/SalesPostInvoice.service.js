const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const VerifactuService = require('./verifactulogs.service');

const {
  salesPostInvoice,
  salesPostInvoiceLine,
  Customer,
} = sequelize.models;

const verifactuService = new VerifactuService();
const isProduction = process.env.NODE_ENV === 'production';

class salesPostInvoiceService {
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']],
      where: {},
      include: [{ model: Customer, as: 'customer', attributes: ['name', 'nif'] }]
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

  async findOne(code, options = {}) {
    const queryOptions = {
      where: { code },
      include: [
        { model: Customer, as: 'customer' }
      ]
    };

    // Agregamos include de líneas si se solicita
    if (options.includeLines) {
      queryOptions.include.push({ model: salesPostInvoiceLine, as: 'lines' });
    }

    // NUEVO: Agregamos include de impuestos (taxes) para el histórico
    queryOptions.include.push({ model: sequelize.models.salesPostInvoiceTax, as: 'taxes' });

    const record = await salesPostInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura registrada no encontrada');
    return record.get({ plain: true });
  }

  async create(data) {
    // Extraemos 'taxes' además de 'lines'
    const { lines, taxes, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Creación de Cabecera (Dispara hooks de numeración)
      const newPostInvoice = await salesPostInvoice.create(headerData, { transaction });

      // 2. Inserción de Líneas (Tu lógica de mapeo manual)
      if (lines && lines.length > 0) {
        const rows = lines.map((line, index) => ({
          code_document: newPostInvoice.code,
          line_no: parseInt(line.lineNo || index + 1),
          item_code: line.codeItem || null,
          description: line.description || '',
          quantity: parseFloat(line.quantity) || 0,
          unit_measure: line.unitMeasure || 'UNIDAD',
          quantity_unit_measure: parseFloat(line.quantityUnitMeasure) || 1,
          unit_price: parseFloat(line.unitPrice) || 0,
          vat: parseFloat(line.vat) || 0,
          amount_line: parseFloat(line.amountLine) || 0,
          user_name: data.username || null,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await sequelize.getQueryInterface().bulkInsert(
          'sales_post_invoice_lines',
          rows,
          { transaction }
        );
      }

      // --- 3. NUEVO: Inserción de Impuestos (Mismo patrón de "Fuerza Bruta") ---
      if (taxes && taxes.length > 0) {
        const taxRows = taxes.map(tax => ({
          invoice_code: newPostInvoice.code,
          tax_type: tax.taxType || 'IVA',
          tax_percentage: parseFloat(tax.taxPercentage) || 0,
          taxable_amount: parseFloat(tax.taxableAmount) || 0,
          tax_amount: parseFloat(tax.taxAmount) || 0,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await sequelize.getQueryInterface().bulkInsert(
          'sales_post_invoice_taxes',
          taxRows,
          { transaction }
        );
      }

      // --- 4. LLAMADA A VERIFACTU ---
      await verifactuService.createLog(newPostInvoice.code, true, transaction);

      await transaction.commit();

      // Retornamos el registro completo incluyendo líneas y taxes
      return await this.findOne(newPostInvoice.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("Error en registro oficial:", error);
      throw error;
    }
  }
}

module.exports = salesPostInvoiceService;
