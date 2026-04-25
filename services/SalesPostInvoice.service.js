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
      // 1. Crear Cabecera
      const newInvoice = await salesPostInvoice.create(headerData, { transaction });

      // 2. Crear Líneas (Asegurando que NO lleven ID previo)
      if (lines && lines.length > 0) {
        const linesToInsert = lines.map((line, index) => {
          const { id, ...cleanLine } = line; // Eliminamos cualquier ID que venga del borrador
          return {
            ...cleanLine,
            codeDocument: newInvoice.code,
            lineNo: line.lineNo || (index + 1),
            username: headerData.username || 'System'
          };
        });

        await salesPostInvoiceLine.bulkCreate(linesToInsert, {
          transaction,
          returning: false // Crucial: No pedimos IDs de vuelta para evitar errores de mapeo
        });
      }

      // 3. Registro Veri*factu
      const isTest = !isProduction;
      await verifactuService.createLog(newInvoice.code, isTest, transaction);

      await transaction.commit();
      return await this.findOne(newInvoice.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      if (error.name === "SequelizeUniqueConstraintError") throw boom.conflict(`La factura ${data.code} ya existe.`);
      throw boom.badImplementation('Error en el registro oficial', error);
    }
  }
}

module.exports = salesPostInvoiceService;
