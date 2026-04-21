const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const VerifactuService = require('./verifactulogs.service'); // Asegúrate que el nombre coincida

const {
  salesPostInvoice,
  salesPostInvoiceLine,
  Customer,
} = sequelize.models;

const verifactuService = new VerifactuService();
const isProduction = process.env.NODE_ENV === 'production';

class salesPostInvoiceService {
  constructor() { }

  async countAll() {
    try {
      return await salesPostInvoice.count();
    } catch (error) {
      throw boom.badImplementation('Error al contar las facturas registradas', error);
    }
  }

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
      throw boom.badImplementation('Error al consultar facturas registradas', error);
    }
  }

  async findOne(code, options = {}) {
    const { includeLines = false } = options;
    const queryOptions = {
      where: { code },
      include: [{ model: Customer, as: 'customer' }]
    };
    if (includeLines) {
      queryOptions.include.push({ model: salesPostInvoiceLine, as: 'lines' });
    }
    const record = await salesPostInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura registrada no encontrada');
    return record.get({ plain: true });
  }

  async create(data) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();
    try {
      const newInvoice = await salesPostInvoice.create(headerData, { transaction });

      if (lines && lines.length > 0) {
        const linesToInsert = lines.map((line, index) => ({
          ...line,
          lineNo: line.lineNo || (index + 1),
          codeDocument: newInvoice.code,
          amountLine: (parseFloat(line.quantity || 0) * parseFloat(line.quantityUnitMeasure || 1) * parseFloat(line.unitPrice || 0)).toFixed(4),
          username: data.username || 'System'
        }));
        await salesPostInvoiceLine.bulkCreate(linesToInsert, { transaction });
      }

      // Registro en Veri*factu
      const isTest = !isProduction;
      await verifactuService.createLog(newInvoice.code, isTest, transaction);

      await transaction.commit();
      return await this.findOne(newInvoice.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      if (error.name === "SequelizeUniqueConstraintError") throw boom.conflict(`La factura ${data.code} ya existe.`);
      throw error.isBoom ? error : boom.badImplementation('Error crítico en el proceso de registro', error);
    }
  }

  async getTotalByBudget(budgetCode) {
    try {
      const total = await salesPostInvoice.sum('amount_with_vat', { where: { budgetCode } });
      return total || 0;
    } catch (error) {
      throw boom.internal('Error al calcular total facturado');
    }
  }
}

module.exports = salesPostInvoiceService;
