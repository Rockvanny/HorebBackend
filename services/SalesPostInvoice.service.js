const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const VerifactuService = require('./verifactulogs.service');

const {
  salesPostInvoice,
  salesPostInvoiceLine,
  Customer,
  DocumentTax // Tabla universal de impuestos
} = sequelize.models;

const verifactuService = new VerifactuService();

class SalesPostInvoiceService {
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']],
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
      const { count, rows } = await salesPostInvoice.findAndCountAll(options);
      return { records: rows, hasMore: (parsedOffset + rows.length) < count, total: count };
    } catch (error) {
      throw boom.badImplementation('Error al consultar histórico', error);
    }
  }

  async findOne(code, options = {}) {
    const queryOptions = {
      where: { code },
      include: [
        { model: Customer, as: 'customer' },
        // Traemos los impuestos vinculados por el movementId
        { model: DocumentTax, as: 'taxes' }
      ]
    };

    if (options.includeLines) {
      queryOptions.include.push({ model: salesPostInvoiceLine, as: 'lines' });
    }

    const record = await salesPostInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura registrada no encontrada');
    return record.get({ plain: true });
  }

  async create(data) {
    // movementId es obligatorio y viene del borrador (salesInvoice)
    const { lines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Creación de Cabecera (Hereda el UUID del movimiento)
      const newPostInvoice = await salesPostInvoice.create(headerData, { transaction });

      // 2. Inserción de Líneas (Histórico inmutable)
      if (lines && lines.length > 0) {
        const rows = lines.map((line, index) => ({
          code_document: newPostInvoice.code,
          line_no: parseInt(line.lineNo || index + 1),
          item_code: line.codeItem || null,
          description: line.description || '',
          quantity: parseFloat(line.quantity) || 0,
          unit_measure: line.unitMeasure || 'UNIDAD',
          quantity_unit_measure: parseFloat(line.quantityUnitMeasure) || 1,
          unit_price: parseFloat(line.unitPrice) || 0,
          tax_type: line.taxType || 'IVA', // Importante para el histórico
          vat: parseFloat(line.vat) || 0,
          amount_line: parseFloat(line.amountLine) || 0,
          user_name: data.username || null,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await sequelize.getQueryInterface().bulkInsert(
          'sales_post_invoice_lines',
          rows,
          { transaction }
        );
      }

      // 3. ACTUALIZACIÓN DE LA TABLA UNIVERSAL DE IMPUESTOS
      // No insertamos, solo "cambiamos la etiqueta" del documento
      await DocumentTax.update(
        { codeDocument: 'salespostinvoice' },
        {
          where: { movementId: newPostInvoice.movementId },
          transaction
        }
      );

      // 4. LOG DE VERIFACTU (Para cumplimiento legal)
      await verifactuService.createLog(newPostInvoice.code, true, transaction);

      await transaction.commit();

      // Devolvemos el registro con sus relaciones
      return await this.findOne(newPostInvoice.code, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("Error al registrar factura definitiva:", error);
      throw error;
    }
  }
}

module.exports = SalesPostInvoiceService;
