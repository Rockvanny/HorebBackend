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
      include: [{ model: Customer, as: 'customer' }]
    };
    if (options.includeLines) queryOptions.include.push({ model: salesPostInvoiceLine, as: 'lines' });

    const record = await salesPostInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura registrada no encontrada');
    return record.get({ plain: true });
  }

  async create(data) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Esto ya funciona (Cabecera)
      const newPostInvoice = await salesPostInvoice.create(headerData, { transaction });

      if (lines && lines.length > 0) {
        // 2. MAPEAMOS DIRECTAMENTE A LOS NOMBRES DE COLUMNA DE POSTGRES (snake_case)
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

        // 3. FUERZA BRUTA: Inserción directa en la tabla
        // Esto ignora el modelo y sus validaciones, va directo a la tabla física
        await sequelize.getQueryInterface().bulkInsert(
          'sales_post_invoice_lines',
          rows,
          { transaction }
        );
      }

      await transaction.commit();
      return newPostInvoice;
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("Error en registro oficial:", error);
      throw error;
    }
  }
}

module.exports = salesPostInvoiceService;
