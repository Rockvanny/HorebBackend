const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const seriesNumberService = require('../services/seriesNumber.service');

// Extraemos los modelos correctamente
const {
  purchInvoice,
  purchInvoiceLine,
  purchpostInvoice,
  purchPostInvoiceLine,
  Vendor,
} = sequelize.models;

class purchInvoiceService {
  constructor() {
    this.seriesNumberService = new seriesNumberService();
  }

  async countAll() {
    try {
      return await purchInvoice.count();
    } catch (error) {
      throw boom.badImplementation('Error al contar las facturas de compra', error);
    }
  }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']], // Estandarizado: lo más nuevo primero
      where: {},
    };

    if (searchTerm) {
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { category: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    try {
      const { count, rows } = await purchInvoice.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar facturas de compra paginadas', error);
    }
  }

  async findOne(code, options = {}) {
    const { includeLines = false } = options;

    const queryOptions = {
      where: { code },
      include: []
    };

    if (includeLines) {
      queryOptions.include.push({
        model: purchInvoiceLine,
        as: 'lines',
        required: false
      });
    }

    const record = await purchInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura de compra no encontrada');

    return record.get({ plain: true });
  }

  async findStatuses() {
    try {
      const attributes = purchInvoice.getAttributes();
      if (attributes.status && attributes.status.values) {
        return attributes.status.values;
      }
      return ['Abierto', 'Pagado'];
    } catch (error) {
      throw boom.badImplementation('No se pudieron obtener los estados');
    }
  }

  async create(data) {
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Crear cabecera (Hook genera el código)
      const newInvoice = await purchInvoice.create(headerData, { transaction });

      let totalNeto = 0;
      let totalIva = 0;

      // 2. Procesar líneas y calcular totales reales
      if (lines && lines.length > 0) {
        const linesToInsert = lines.map((line, index) => {
          const qty = parseFloat(line.quantity) || 0;
          const price = parseFloat(line.unitPrice) || 0;
          const factor = parseFloat(line.quantityUnitMeasure) || 1;
          const vatPerc = parseFloat(line.vat) || 0;

          const lineAmount = qty * factor * price;
          const lineVat = lineAmount * (vatPerc / 100);

          totalNeto += lineAmount;
          totalIva += lineVat;

          return {
            ...line,
            lineNo: line.lineNo || (index + 1),
            codeDocument: newInvoice.code, // Clave foránea estandarizada
            amountLine: lineAmount
          };
        });
        await purchInvoiceLine.bulkCreate(linesToInsert, { transaction });
      } else {
        // Línea vacía por defecto
        await purchInvoiceLine.create({
          codeDocument: newInvoice.code,
          lineNo: 1,
          description: 'Nueva línea',
          quantity: 1,
          unitPrice: 0,
          amountLine: 0
        }, { transaction });
      }

      // 3. Actualizar totales finales en la cabecera
      await newInvoice.update({
        amountWithoutVAT: totalNeto,
        amountVAT: totalIva,
        amountWithVAT: totalNeto + totalIva
      }, { transaction });

      await transaction.commit();
      return await this.findOne(newInvoice.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async update(code, changes) {
    const { lines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();

    try {
      const instance = await purchInvoice.findOne({ where: { code }, transaction });
      if (!instance) throw boom.notFound('Factura no encontrada');

      // Limpieza de campos sensibles
      const cleanHeader = { ...headerChanges };
      delete cleanHeader.id;
      delete cleanHeader.code;
      delete cleanHeader.createdAt;
      delete cleanHeader.updatedAt;

      await instance.update(cleanHeader, { transaction });

      if (lines) {
        // Lógica Flush & Fill estandarizada
        await purchInvoiceLine.destroy({ where: { codeDocument: code }, transaction });

        if (lines.length > 0) {
          const linesToInsert = lines.map((line, index) => {
            const { id, ...lineData } = line;
            return {
              ...lineData,
              codeDocument: code,
              lineNo: line.lineNo || (index + 1),
              username: line.username || cleanHeader.username || 'system'
            };
          });
          await purchInvoiceLine.bulkCreate(linesToInsert, { transaction });
        }
      }

      await transaction.commit();
      return await this.findOne(code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async archiveInvoice(invoiceCode) {
    const transaction = await sequelize.transaction();
    try {
      const invoice = await purchInvoice.findByPk(invoiceCode, {
        include: [{ model: purchInvoiceLine, as: 'lines' }],
        transaction
      });

      if (!invoice) throw boom.notFound('Factura de compra no encontrada');
      if (invoice.status !== 'Pagado') throw boom.badRequest('Solo se pueden archivar facturas "Pagadas"');

      // Nueva serie histórica para compras
      const newNumber = await this.seriesNumberService.updateLastUsedSerie('Fact_compra_regist', invoice.codePosting, transaction);

      const invoicePostData = invoice.toJSON();
      invoicePostData.code = newNumber;
      invoicePostData.preInvoice = invoiceCode;

      // Crear Histórico
      const newInvoicePost = await purchpostInvoice.create(invoicePostData, { transaction });

      if (invoice.lines && invoice.lines.length > 0) {
        const linesToCreate = invoice.lines.map(line => {
          const l = line.toJSON();
          l.codeDocument = newInvoicePost.code; // Estandarizado a codeDocument
          return l;
        });
        await purchPostInvoiceLine.bulkCreate(linesToCreate, { transaction });
      }

      // Eliminar original (Cascade destroy)
      await invoice.destroy({ transaction });

      await transaction.commit();
      return { message: newNumber, postInvoice: newInvoicePost };

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async delete(code) {
    const instance = await purchInvoice.findByPk(code);
    if (!instance) throw boom.notFound('Factura no encontrada');
    await instance.destroy();
    return { code, message: 'Factura eliminada correctamente' };
  }
}

module.exports = purchInvoiceService;
