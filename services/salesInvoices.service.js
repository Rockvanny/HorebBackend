const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { salesInvoice, salesInvoiceLine, DocumentTax } = sequelize.models;

const SalesPostInvoiceService = require('./salesPostInvoice.service');
// IMPORTANTE: Cambiamos a la librería correcta y función correcta
const { calculateDocumentTotals } = require('../libs/taxCalculation');
const postService = new SalesPostInvoiceService();

class salesInvoiceService {

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['createdAt', 'DESC']],
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
      const { count, rows } = await salesInvoice.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar facturas paginadas', error);
    }
  }

  async findOne(id, options = {}) {
    const { includeLines = false } = options;
    const isNumeric = !isNaN(id) && !isNaN(parseFloat(id));
    const queryOptions = {
      where: isNumeric ? { id } : { code: id },
      include: [{ model: DocumentTax, as: 'taxes' }]
    };

    if (includeLines) queryOptions.include.push({ model: salesInvoiceLine, as: 'lines' });

    const record = await salesInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura no encontrada');
    return record;
  }

  async create(data, userId) {
    const { lines: rawLines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Crear Cabecera
      headerData.username = userId;
      const newInvoice = await salesInvoice.create(headerData, { transaction });

      // 2. Calcular usando la librería unificada (Igual que en presupuestos)
      const { processedLines, taxesToInsert, headerTotals } = calculateDocumentTotals(
        rawLines || [],
        newInvoice.movementId,
        'salesinvoice' // Identificador coherente para DocumentTax
      );

      // 3. Insertar Líneas
      if (processedLines.length > 0) {
        const linesToInsert = processedLines.map(l => ({
          ...l,
          codeDocument: newInvoice.code
        }));
        await salesInvoiceLine.bulkCreate(linesToInsert, { transaction });
      }

      // 4. Insertar Impuestos Desglosados
      if (taxesToInsert.length > 0) {
        await DocumentTax.bulkCreate(taxesToInsert, { transaction });
      }

      // 5. Actualizar totales finales en la cabecera (Usando headerTotals)
      await newInvoice.update(headerTotals, { transaction });

      await transaction.commit();
      return await this.findOne(newInvoice.id, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async update(id, changes) {
    const { lines: rawLines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();
    try {
      const instance = await this.findOne(id, { transaction });

      let totalsUpdate = {};

      if (rawLines) {
        // Recalcular todo con la lógica de impuestos y factores
        const { processedLines, taxesToInsert, headerTotals } = calculateDocumentTotals(
          rawLines,
          instance.movementId,
          'salesinvoice'
        );

        totalsUpdate = headerTotals;

        // Limpieza de registros antiguos
        await salesInvoiceLine.destroy({ where: { codeDocument: instance.code }, transaction });
        await DocumentTax.destroy({
          where: { movementId: instance.movementId, codeDocument: 'salesinvoice' },
          transaction
        });

        // Re-insertar líneas e impuestos procesados
        const linesToInsert = processedLines.map(l => ({ ...l, codeDocument: instance.code }));
        await salesInvoiceLine.bulkCreate(linesToInsert, { transaction });
        await DocumentTax.bulkCreate(taxesToInsert, { transaction });
      }

      const cleanHeader = { ...headerChanges, ...totalsUpdate };
      delete cleanHeader.id;
      delete cleanHeader.code;
      delete cleanHeader.movementId;

      await instance.update(cleanHeader, { transaction });

      await transaction.commit();
      return await this.findOne(instance.id, { includeLines: true });
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async archiveInvoice(code, userId) {
    const invoice = await salesInvoice.findOne({
      where: { code },
      include: [
        { model: salesInvoiceLine, as: 'lines' },
        { model: DocumentTax, as: 'taxes' }
      ]
    });

    if (!invoice) throw boom.notFound('Factura no encontrada');
    const invoiceData = invoice.get({ plain: true });

    invoiceData.preInvoice = invoiceData.code;
    invoiceData.username = userId;
    invoiceData.seriesCode = invoiceData.codePosting;
    invoiceData.code = null;
    delete invoiceData.id;

    const result = await postService.create(invoiceData);

    if (result) {
      await invoice.destroy();
    }

    return result;
  }
}

module.exports = salesInvoiceService;
