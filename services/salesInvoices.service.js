const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const SalesPostInvoiceService = require('./salesPostInvoice.service');
const { calculateTransactionTotals } = require('../libs/calculations');
const postService = new SalesPostInvoiceService();

class salesInvoiceService {

  // --- MÉTODOS DE APOYO (NUEVOS) ---

  /**
   * Agrupa las líneas por porcentaje de IVA para generar el desglose de la tabla taxes
   */
  groupTaxes(lines, invoiceCode) {
    const groups = lines.reduce((acc, line) => {
      const vat = parseFloat(line.vat || 0);
      const key = vat.toFixed(2);

      if (!acc[key]) {
        acc[key] = {
          invoiceCode: invoiceCode,
          taxType: 'IVA',
          taxPercentage: vat,
          taxableAmount: 0,
          taxAmount: 0
        };
      }

      // Base = Cantidad * Precio
      const base = parseFloat(line.quantity) * parseFloat(line.unitPrice);
      const tax = (base * vat) / 100;

      acc[key].taxableAmount += base;
      acc[key].taxAmount += tax;

      return acc;
    }, {});

    return Object.values(groups);
  }

  // --- MÉTODOS DE BÚSQUEDA ---

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['createdAt', 'DESC']],
      where: {},
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
      console.error("Error en paginado de facturas:", error);
      throw boom.badImplementation('Error al consultar registros paginados', error);
    }
  }

  async findOne(code, options = {}) {
    // Agregamos includeTaxes por defecto para ver el desglose
    const { includeLines = false, includeTaxes = true } = options;
    const queryOptions = { where: { code }, include: [] };

    if (includeLines) queryOptions.include.push({ model: salesInvoiceLine, as: 'lines' });

    const record = await salesInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Registro no encontrado');
    return record.get({ plain: true });
  }

  // --- LÓGICA DE PERSISTENCIA ---

  async create(data, userId) {
    const { lines: rawLines, ...headerData } = data;
    const transaction = await sequelize.transaction();
    try {
      const result = calculateTransactionTotals(rawLines || []);

      headerData.amountWithoutVAT = result.amountWithoutVAT;
      headerData.amountVAT = result.amountVAT;
      headerData.amountWithVAT = result.amountWithVAT;
      headerData.username = userId;

      const newInvoice = await salesInvoice.create(headerData, { transaction });

      if (result.processedLines.length > 0) {
        // 1. Insertar Líneas (Manteniendo tu lógica original)
        const linesToInsert = result.processedLines.map((line, index) => ({
          ...line,
          id: undefined,
          codeDocument: newInvoice.code,
          lineNo: line.lineNo || index + 1,
        }));
        await salesInvoiceLine.bulkCreate(linesToInsert, { transaction });

        // 2. NUEVO: Insertar Desglose de Impuestos
        const taxesToInsert = this.groupTaxes(linesToInsert, newInvoice.code);
      }

      await transaction.commit();
      return await this.findOne(newInvoice.code, { includeLines: true, includeTaxes: true });
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async update(code, changes) {
    const { lines: rawLines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();
    try {
      const instance = await salesInvoice.findOne({ where: { code }, transaction });
      if (!instance) throw boom.notFound('Registro no encontrado');

      if (rawLines) {
        const result = calculateTransactionTotals(rawLines);

        headerChanges.amountWithoutVAT = result.amountWithoutVAT;
        headerChanges.amountVAT = result.amountVAT;
        headerChanges.amountWithVAT = result.amountWithVAT;

        // Limpieza de líneas e impuestos antiguos
        await salesInvoiceLine.destroy({ where: { codeDocument: code }, transaction });

        const linesToInsert = result.processedLines.map((line, index) => {
          const { id, ...cleanLine } = line;
          return {
            ...cleanLine,
            codeDocument: code,
            lineNo: line.lineNo || index + 1,
            amountLine: line.amountLine
          };
        });
        await salesInvoiceLine.bulkCreate(linesToInsert, { transaction });

        // NUEVO: Regenerar Desglose de Impuestos
        const taxesToInsert = this.groupTaxes(linesToInsert, code);
      }

      delete headerChanges.id;
      delete headerChanges.code;

      await instance.update(headerChanges, { transaction });

      await transaction.commit();
      return await this.findOne(code, { includeLines: true, includeTaxes: true });
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async archiveInvoice(code, userId) {
    const invoice = await salesInvoice.findOne({
      where: { code },
      include: [
        { model: salesInvoiceLine, as: 'lines' }
      ]
    });
    if (!invoice) throw boom.notFound('Factura no encontrada');

    const invoiceData = invoice.get({ plain: true });

    // 1. Limpieza de metadatos de las líneas (MANTENIENDO TU MAPEO ORIGINAL)
    if (invoiceData.lines) {
      invoiceData.lines = invoiceData.lines.map((line, index) => {
        const { id, createdAt, updatedAt, ...cleanLine } = line;
        return {
          lineNo: parseInt(line.lineNo || index + 1),
          codeItem: line.codeItem,
          description: line.description,
          quantity: parseFloat(line.quantity),
          unitMeasure: line.unitMeasure,
          unitPrice: parseFloat(line.unitPrice),
          vat: parseFloat(line.vat),
          amountLine: parseFloat(line.amountLine),
        };
      });
    }

    // 2. NUEVO: Limpieza de impuestos para el envío a Post
    if (invoiceData.taxes) {
      invoiceData.taxes = invoiceData.taxes.map(tax => {
        // Quitamos IDs y timestamps para que postService genere nuevos
        const { id, createdAt, updatedAt, invoiceCode, ...cleanTax } = tax;
        return cleanTax;
      });
    }

    // 3. Lógica de archivado original
    invoiceData.preInvoice = invoiceData.code;
    invoiceData.username = userId;
    invoiceData.seriesCode = invoiceData.codePosting;
    invoiceData.code = null;
    delete invoiceData.id;

    // Enviamos el objeto con 'lines' y 'taxes' al postService
    const result = await postService.create(invoiceData);

    if (result) {
      await invoice.destroy();
    }

    return result;
  }
}

module.exports = salesInvoiceService;
