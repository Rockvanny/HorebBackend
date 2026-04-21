const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const {
  salesPostInvoice,
  salesPostInvoiceLine,
  Customer,
} = sequelize.models;

class salesPostInvoiceService {
  constructor() { }

  /**
   * CONTADOR TOTAL
   */
  async countAll() {
    try {
      return await salesPostInvoice.count();
    } catch (error) {
      throw boom.badImplementation('Error al contar las facturas registradas', error);
    }
  }

  /**
   * LISTADO PAGINADO (NORMALIZADO)
   */
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']], // Orden por fecha de registro
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
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar facturas registradas paginadas', error);
    }
  }

  /**
   * BUSCAR UNA ESPECÍFICA (CON LÍNEAS)
   */
  async findOne(code, options = {}) {
    const { includeLines = false } = options;

    const queryOptions = {
      where: { code },
      include: [{ model: Customer, as: 'customer' }]
    };

    if (includeLines) {
      queryOptions.include.push({
        model: salesPostInvoiceLine,
        as: 'lines'
      });
    }

    const record = await salesPostInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura registrada no encontrada');

    return record.get({ plain: true });
  }

  /**
   * ACCIÓN DE REGISTRO (CREACIÓN ÚNICA E IRREVERSIBLE)
   */
  async create(data) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Crear cabecera (El hook generateNextCode asignará el número oficial)
      const newInvoice = await salesPostInvoice.create(headerData, { transaction });

      // 2. Procesar y sellar líneas
      if (lines && lines.length > 0) {
        const linesToInsert = lines.map((line, index) => {
          // Recalculamos por seguridad para que el registro sea fiel a los importes
          const qty = parseFloat(line.quantity) || 0;
          const price = parseFloat(line.unitPrice) || 0;
          const factor = parseFloat(line.quantityUnitMeasure) || 1;
          const lineAmount = qty * factor * price;

          return {
            ...line,
            lineNo: line.lineNo || (index + 1),
            codeDocument: newInvoice.code, // Referencia a la nueva factura
            amountLine: lineAmount,
            username: data.username || 'System'
          };
        });

        await salesPostInvoiceLine.bulkCreate(linesToInsert, { transaction });
      }

      // 3. Confirmar transacción
      await transaction.commit();

      // Retornamos el registro completo para el frontend
      return await this.findOne(newInvoice.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();

      if (error.name === "SequelizeUniqueConstraintError") {
        throw boom.conflict(`La factura ${data.code} ya existe.`);
      }
      throw boom.badImplementation('Error crítico al registrar la factura', error);
    }
  }

  /**
   * UTILIDAD PARA GRÁFICOS / PRESUPUESTOS
   */
  async getTotalByBudget(budgetCode) {
    try {
      const total = await salesPostInvoice.sum('amount_with_vat', {
        where: { budgetCode }
      });
      return total || 0;
    } catch (error) {
      throw boom.internal('Error al calcular total facturado');
    }
  }
}

module.exports = salesPostInvoiceService;
