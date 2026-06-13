// services/purchInvoice.service
const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { purchInvoice, purchInvoiceLine, DocumentTax } = sequelize.models;

const PurchPostInvoiceService = require('./purchPostInvoice.service');
// Librería de cálculo unificada
const { calculateDocumentTotals } = require('../libs/taxCalculation');
const postService = new PurchPostInvoiceService();

class purchInvoiceService {

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['createdAt', 'DESC']], // Sincronizado a camelCase igual que en ventas
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

  /**
   * Busca facturas por código de proveedor (Equivalente exacto a findByCustomer)
   * Blindado contra valores indefinidos o nulos para asegurar la carga del Frontend.
   */
  async findByVendor(entityCode) {
    // Control preventivo: si no viene un código de proveedor real, devolvemos un array vacío sin romper el hilo
    if (!entityCode || entityCode === 'undefined' || entityCode === 'null') {
      console.log("DEBUG BACKEND: findByVendor ignorado por código vacío o inválido");
      return [];
    }

    try {
      return await purchInvoice.findAll({
        where: { entityCode: entityCode },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      throw boom.badImplementation('Error al buscar facturas por proveedor', error);
    }
  }

  async findOne(id, options = {}) {
    const { includeLines = false } = options;
    const isNumeric = !isNaN(id) && !isNaN(parseFloat(id));
    const queryOptions = {
      where: isNumeric ? { id } : { code: id },
      include: [{ model: DocumentTax, as: 'taxes' }]
    };

    if (includeLines) queryOptions.include.push({ model: purchInvoiceLine, as: 'lines' });

    const record = await purchInvoice.findOne(queryOptions);
    if (!record) throw boom.notFound('Factura de compra no encontrada');
    return record;
  }

  async create(data, userId) {
    const { lines: rawLines, ...headerData } = data;
    const transaction = await sequelize.transaction();

    try {
      // 1. Crear Cabecera
      headerData.userName = userId; // Respeta el camelCase particular del modelo compras (userName)
      const newInvoice = await purchInvoice.create(headerData, { transaction });

      // 2. Calcular usando la librería unificada
      const { processedLines, taxesToInsert, headerTotals } = calculateDocumentTotals(
        rawLines || [],
        newInvoice.movementId,
        'purchinvoice' // Identificador coherente para DocumentTax en compras
      );

      // 3. Insertar Líneas
      if (processedLines.length > 0) {
        const linesToInsert = processedLines.map(l => ({
          ...l,
          codeDocument: newInvoice.code
        }));
        await purchInvoiceLine.bulkCreate(linesToInsert, { transaction });
      }

      // 4. Insertar Impuestos Desglosados
      if (taxesToInsert.length > 0) {
        await DocumentTax.bulkCreate(taxesToInsert, { transaction });
      }

      // 5. Actualizar totales finales en la cabecera
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
          'purchinvoice'
        );

        totalsUpdate = headerTotals;

        // 1. Limpieza absoluta de líneas e impuestos antiguos de esta factura
        await purchInvoiceLine.destroy({ where: { codeDocument: instance.code }, transaction });
        await DocumentTax.destroy({
          where: { movementId: instance.movementId, codeDocument: 'purchinvoice' },
          transaction
        });

        // 2. Preparar e insertar líneas de compra limpias de ID
        const linesToInsert = processedLines.map(l => {
          const { id, ...cleanLine } = l; // <-- Aislamos y eliminamos el id viejo de la línea
          return {
            ...cleanLine,
            codeDocument: instance.code
          };
        });
        await purchInvoiceLine.bulkCreate(linesToInsert, { transaction });

        // 3. Preparar e insertar impuestos de compra limpios de ID
        const taxesToInsertClean = taxesToInsert.map(t => {
          const { id, ...cleanTax } = t; // <-- Aislamos y eliminamos el id viejo del impuesto
          return cleanTax;
        });
        await DocumentTax.bulkCreate(taxesToInsertClean, { transaction });
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

  /**
   * Archivar factura de compra (Pasar a factura definitiva/contabilizada histórica)
   * Clon 1:1 del flujo de negocio de ventas
   */
  async archiveInvoice(idOrCode, userId) {
    const isNumeric = !isNaN(idOrCode) && !isNaN(parseFloat(idOrCode));

    const whereCondition = isNumeric
      ? { id: idOrCode }
      : { code: idOrCode };

    const invoice = await purchInvoice.findOne({
      where: whereCondition,
      include: [
        { model: purchInvoiceLine, as: 'lines' },
        { model: DocumentTax, as: 'taxes' }
      ]
    });

    if (!invoice) throw boom.notFound('Factura de compra no encontrada');

    const invoiceData = invoice.get({ plain: true });

    // Preparar datos para el histórico de compras
    invoiceData.preInvoice = invoiceData.code;
    invoiceData.userName = userId; // camelCase de auditoría de compras
    invoiceData.seriesCode = invoiceData.codePosting;
    invoiceData.code = null;
    delete invoiceData.id;

    // Crear en la tabla de históricos de compras registradas y purgar el borrador
    const result = await postService.create(invoiceData);

    if (result) {
      await invoice.destroy();
    }

    return result;
  }
}

module.exports = purchInvoiceService;
