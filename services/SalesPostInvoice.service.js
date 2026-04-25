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
      const newPostInvoice = await salesPostInvoice.create(headerData, { transaction });

      if (lines && lines.length > 0) {
        const linesToInsert = lines.map((line, index) => {
          // Forzamos el mapeo uno a uno para evitar que falten campos 'allowNull: false'
          return {
            codeDocument: newPostInvoice.code,
            lineNo: line.lineNo || (index + 1),
            codeItem: line.codeItem || null,
            description: line.description || '',
            quantity: Number(line.quantity) || 0,
            unitMeasure: line.unitMeasure || 'UNIDAD',
            quantityUnitMeasure: Number(line.quantityUnitMeasure) || 1,
            unitPrice: Number(line.unitPrice) || 0,
            vat: Number(line.vat) || 0,
            amountLine: Number(line.amountLine) || 0,
            username: line.username || null,
            // IMPORTANTE: id debe ser undefined para que la DB genere el nuevo
            id: undefined
          };
        });

        await salesPostInvoiceLine.bulkCreate(linesToInsert, { transaction });
      }

      await transaction.commit();
      return newPostInvoice;
    } catch (error) {
      await transaction.rollback();
      console.error("Error en el registro oficial:", error);
      throw error;
    }
  }
}

module.exports = salesPostInvoiceService;
