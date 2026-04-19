const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const seriesNumberService = require('../services/seriesNumber.service');

// Extraemos los modelos correctamente
const {
  salesInvoice,
  salesInvoiceLine,
  salesPostInvoice,
  salesPostInvoiceLine,
} = sequelize.models;

class salesInvoiceService {
  constructor() {
    this.seriesNumberService = new seriesNumberService();
  }

  /**
   * VALIDACIÓN PRIVADA: Consistencia Fiscal (Veri*factu)
   */
  _validateFiscalConsistency(data) {
    const { typeInvoice, parentCode, amountWithVAT } = data;

    // 1. Trazabilidad: Las rectificativas (R) exigen factura de origen
    if (typeInvoice && typeInvoice.startsWith('R')) {
      if (!parentCode || parentCode.trim() === '') {
        throw boom.badRequest('Normativa AEAT: El campo parentCode es obligatorio para facturas rectificativas.');
      }
    }

    // 2. Coherencia: F1 no debe ser negativa (en ese caso es R1)
    if (typeInvoice === 'F1' && amountWithVAT < 0) {
      throw boom.badRequest('Una factura F1 no puede ser negativa. Cambie el tipo a R1 (Rectificativa).');
    }
  }

  /**
   * METADATOS PARA EL FRONTEND
   */
  async findStatuses() {
    try {
      const attributes = salesInvoice.getAttributes();
      return attributes.status?.values || ['Abierto', 'Pagado'];
    } catch (error) {
      throw boom.badImplementation('Error al obtener estados');
    }
  }

  async findTypeInvoices() {
    try {
      const attributes = salesInvoice.getAttributes();
      // Retorna ['F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'] desde el ENUM del modelo
      return attributes.typeInvoice?.values || ['F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'];
    } catch (error) {
      throw boom.badImplementation('Error al obtener tipos de factura');
    }
  }

  /**
   * CONSULTAS
   */
  async countAll() {
    return await salesInvoice.count();
  }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']],
      where: {},
    };

    if (searchTerm) {
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { nif: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    const { count, rows } = await salesInvoice.findAndCountAll(options);
    return {
      records: rows,
      hasMore: (parsedOffset + rows.length) < count,
      total: count,
    };
  }

  async findOne(code, options = {}) {
    const { includeLines = false } = options;
    const queryOptions = {
      where: { code },
      include: []
    };

    if (includeLines) {
      queryOptions.include.push({
        model: salesInvoiceLine,
        as: 'lines',
        required: false
      });
    }

    const record = await salesInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura no encontrada');
    return record.get({ plain: true });
  }

  /**
   * ESCRITURA CON RECALCULO DE TOTALES
   */
  async create(data) {
    const { lines, ...headerData } = data;
    this._validateFiscalConsistency(headerData);

    const transaction = await sequelize.transaction();
    try {
      const newInvoice = await salesInvoice.create(headerData, { transaction });

      let totalNeto = 0;
      let totalIva = 0;

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
            codeDocument: newInvoice.code,
            amountLine: lineAmount
          };
        });
        await salesInvoiceLine.bulkCreate(linesToInsert, { transaction });
      } else {
        throw boom.badRequest('La factura debe tener al menos una línea.');
      }

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
      const instance = await salesInvoice.findOne({ where: { code }, transaction });
      if (!instance) throw boom.notFound('Factura no encontrada');

      this._validateFiscalConsistency({ ...instance.toJSON(), ...headerChanges });

      const cleanHeader = { ...headerChanges };
      delete cleanHeader.id;
      delete cleanHeader.code;

      await instance.update(cleanHeader, { transaction });

      if (lines) {
        await salesInvoiceLine.destroy({ where: { codeDocument: code }, transaction });

        let totalNeto = 0;
        let totalIva = 0;

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
            codeDocument: code,
            lineNo: line.lineNo || (index + 1),
            amountLine: lineAmount
          };
        });

        await salesInvoiceLine.bulkCreate(linesToInsert, { transaction });

        await instance.update({
          amountWithoutVAT: totalNeto,
          amountVAT: totalIva,
          amountWithVAT: totalNeto + totalIva
        }, { transaction });
      }

      await transaction.commit();
      return await this.findOne(code, { includeLines: true });
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  /**
   * PROCESO DE ARCHIVADO (REGISTRO LEGAL)
   */
  async archiveInvoice(invoiceCode) {
    const transaction = await sequelize.transaction();
    try {
      const invoice = await salesInvoice.findByPk(invoiceCode, {
        include: [{ model: salesInvoiceLine, as: 'lines' }],
        transaction
      });

      if (!invoice) throw boom.notFound('Factura no encontrada');
      if (invoice.status !== 'Pagado') throw boom.badRequest('Solo se pueden registrar facturas Pagadas.');

      this._validateFiscalConsistency(invoice);

      // Consumir número de serie legal
      const newNumber = await this.seriesNumberService.updateLastUsedSerie(
        'Fact_venta_regist',
        invoice.codePosting,
        transaction
      );

      const invoicePostData = invoice.toJSON();
      invoicePostData.code = newNumber;
      invoicePostData.preInvoice = invoiceCode;

      const newInvoicePost = await salesPostInvoice.create(invoicePostData, { transaction });

      if (invoice.lines && invoice.lines.length > 0) {
        const linesToCreate = invoice.lines.map(line => {
          const l = line.toJSON();
          delete l.id;
          l.codeDocument = newInvoicePost.code;
          return l;
        });
        await salesPostInvoiceLine.bulkCreate(linesToCreate, { transaction });
      }

      await invoice.destroy({ transaction });
      await transaction.commit();

      return { message: newNumber, postInvoice: newInvoicePost };
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async delete(code) {
    const instance = await salesInvoice.findByPk(code);
    if (!instance) throw boom.notFound('Factura no encontrada');
    await instance.destroy();
    return { code, message: 'Borrador eliminado correctamente' };
  }
}

module.exports = salesInvoiceService;
