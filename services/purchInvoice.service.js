const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { purchInvoice, purchInvoiceLine, DocumentTax } = sequelize.models;

// Importamos la librería de cálculo unificada
const { calculateDocumentTotals } = require('../libs/taxCalculation');

class purchInvoiceService {
  constructor() {}

  async findPaginated({ limit, offset, searchTerm, filter }) {
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

    if (filter === 'overdue') {
      const todayStr = new Date().toLocaleDateString('en-CA');
      options.where[Op.and] = [
        sequelize.where(
          sequelize.cast(sequelize.col('due_date'), 'DATE'),
          { [Op.lt]: todayStr }
        ),
        { status: { [Op.ne]: 'Pagado' } }
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
      throw boom.badImplementation('Error al consultar compras paginadas', error);
    }
  }

  async findOne(idOrCode, options = {}) {
    const { includeLines = false } = options;
    const isNumeric = !isNaN(idOrCode) && !isNaN(parseFloat(idOrCode));

    const queryOptions = {
      where: isNumeric ? { id: idOrCode } : { code: idOrCode },
      include: [{ model: DocumentTax, as: 'taxes' }]
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
    return record;
  }

  async create(data, userId) {
    const { lines: rawLines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Crear Cabecera
      headerData.userName = userId;
      const newInvoice = await purchInvoice.create(headerData, { transaction });

      // 2. Calcular totales e impuestos usando la librería (Espejo de Ventas)
      const { processedLines, taxesToInsert, headerTotals } = calculateDocumentTotals(
        rawLines || [],
        newInvoice.movementId,
        'purchinvoice' // Identificador para la tabla DocumentTax
      );

      // 3. Insertar Líneas
      if (processedLines.length > 0) {
        const linesToInsert = processedLines.map((l, index) => ({
          ...l,
          lineNo: l.lineNo || (index + 1),
          codeDocument: newInvoice.code
        }));
        await purchInvoiceLine.bulkCreate(linesToInsert, { transaction });
      } else {
        // Línea por defecto si no vienen líneas
        await purchInvoiceLine.create({
          codeDocument: newInvoice.code,
          lineNo: 1,
          description: 'Nueva línea de compra',
          quantity: 1,
          unitPrice: 0,
          amountLine: 0
        }, { transaction });
      }

      // 4. Insertar Impuestos Desglosados
      if (taxesToInsert.length > 0) {
        await DocumentTax.bulkCreate(taxesToInsert, { transaction });
      }

      // 5. Actualizar totales finales en cabecera
      await newInvoice.update(headerTotals, { transaction });

      await transaction.commit();
      return await this.findOne(newInvoice.id, { includeLines: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async update(idOrCode, changes) {
    const { lines: rawLines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();

    try {
      const instance = await this.findOne(idOrCode, { transaction });

      let totalsUpdate = {};

      if (rawLines) {
        // Recalcular con la lógica de impuestos (Espejo de Ventas)
        const { processedLines, taxesToInsert, headerTotals } = calculateDocumentTotals(
          rawLines,
          instance.movementId,
          'purchinvoice'
        );

        totalsUpdate = headerTotals;

        // Limpieza Flush & Fill
        await purchInvoiceLine.destroy({ where: { codeDocument: instance.code }, transaction });
        await DocumentTax.destroy({
          where: { movementId: instance.movementId, codeDocument: 'purchinvoice' },
          transaction
        });

        // Re-insertar líneas e impuestos
        const linesToInsert = processedLines.map((l, index) => ({
          ...l,
          lineNo: l.lineNo || (index + 1),
          codeDocument: instance.code
        }));

        await purchInvoiceLine.bulkCreate(linesToInsert, { transaction });
        if (taxesToInsert.length > 0) {
          await DocumentTax.bulkCreate(taxesToInsert, { transaction });
        }
      }

      // Limpieza de campos sensibles
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

  async delete(idOrCode) {
    const instance = await this.findOne(idOrCode);
    await instance.destroy();
    return { idOrCode, message: 'Factura de compra eliminada correctamente' };
  }

  // Helpers para Enums
  async findStatuses() {
    const attributes = purchInvoice.getAttributes();
    return attributes.status?.values || ['Abierto', 'Pagado'];
  }

  async findCategories() {
    const attributes = purchInvoice.getAttributes();
    return attributes.category?.values || [];
  }
}

module.exports = purchInvoiceService;
