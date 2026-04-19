const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const seriesNumberService = require('../services/seriesNumber.service');

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
    const { typeInvoice, parentCode, rectificationType, amountWithVAT } = data;

    // 1. Trazabilidad: Las rectificativas (R) exigen factura de origen y MÉTODO
    if (typeInvoice && typeInvoice.startsWith('R')) {
      if (!parentCode || parentCode.trim() === '') {
        throw boom.badRequest('Normativa AEAT: El campo parentCode es obligatorio para facturas rectificativas.');
      }
      // NUEVO: Validamos que si es R, tenga un método (S o I)
      if (!rectificationType) {
        throw boom.badRequest('Normativa AEAT: Debe indicar el tipo de rectificación (Sustitución o Diferencias).');
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
      return attributes.typeInvoice?.values || ['F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5'];
    } catch (error) {
      throw boom.badImplementation('Error al obtener tipos de factura');
    }
  }

  /**
   * NUEVO: Recuperar valores de Rectificación (S, I) para el Front
   */
  async findRectificationTypes() {
    try {
      const attributes = salesInvoice.getAttributes();
      // Retorna ['S', 'I'] desde el ENUM del modelo
      return attributes.rectificationType?.values || ['S', 'I'];
    } catch (error) {
      throw boom.badImplementation('Error al obtener tipos de rectificación');
    }
  }

  // ... (countAll y findPaginated se mantienen igual)

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

    // Si es rectificativa y no viene tipo, forzamos 'S' (Sustitución) por defecto para ayudar al usuario
    if (headerData.typeInvoice?.startsWith('R') && !headerData.rectificationType) {
      headerData.rectificationType = 'S';
    }

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
        // Línea por defecto
        await salesInvoiceLine.create({
          codeDocument: newInvoice.code,
          lineNo: 1,
          description: 'Nueva línea',
          quantity: 1,
          unitPrice: 0,
          amountLine: 0
        }, { transaction });
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

      // Validamos los cambios mezclados con lo que ya existe
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

  // archiveInvoice y delete se mantienen igual...
}

module.exports = salesInvoiceService;
