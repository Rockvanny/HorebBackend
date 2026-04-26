const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { salesInvoice, salesInvoiceLine, DocumentTax } = sequelize.models;

const SalesPostInvoiceService = require('./salesPostInvoice.service');
// Importamos la librería universal de cálculos
const { calculateDocumentTotals } = require('../libs/calculations');
const postService = new SalesPostInvoiceService();

class salesInvoiceService {

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['createdAt', 'DESC']],
      where: {},
      include: [{ model: DocumentTax, as: 'taxes' }] // Incluimos impuestos en el listado
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
    // Buscamos por ID o Code dinámicamente
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
      // 1. Crear Cabecera (Genera code y movementId vía Hooks)
      headerData.username = userId;
      const newInvoice = await salesInvoice.create(headerData, { transaction });

      // 2. Calcular usando la librería universal
      const { processedLines, taxesToInsert, totals } = calculateDocumentTotals(
        rawLines || [],
        newInvoice.movementId,
        'invoice' // Identificador para la tabla DocumentTax
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

      // 5. Actualizar totales finales en la cabecera
      await newInvoice.update(totals, { transaction });

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
        // Recalcular todo
        const { processedLines, taxesToInsert, totals } = calculateDocumentTotals(
          rawLines,
          instance.movementId,
          'invoice'
        );

        totalsUpdate = totals;

        // Limpieza de líneas e impuestos antiguos
        await salesInvoiceLine.destroy({ where: { codeDocument: instance.code }, transaction });
        await DocumentTax.destroy({
          where: { movementId: instance.movementId, codeDocument: 'invoice' },
          transaction
        });

        // Re-insertar
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
    // Buscamos la factura con líneas e impuestos
    const invoice = await salesInvoice.findOne({
      where: { code },
      include: [
        { model: salesInvoiceLine, as: 'lines' },
        { model: DocumentTax, as: 'taxes' }
      ]
    });

    if (!invoice) throw boom.notFound('Factura no encontrada');
    const invoiceData = invoice.get({ plain: true });

    // Preparación de datos para el archivado (PostInvoice)
    invoiceData.preInvoice = invoiceData.code;
    invoiceData.username = userId;
    invoiceData.seriesCode = invoiceData.codePosting;
    invoiceData.code = null;
    delete invoiceData.id;

    // El postService debe estar preparado para recibir 'lines' y 'taxes'
    const result = await postService.create(invoiceData);

    if (result) {
      await invoice.destroy(); // El hook afterDestroy limpiará DocumentTax automáticamente
    }

    return result;
  }
}

module.exports = salesInvoiceService;
