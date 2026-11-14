// services/purchInvoice.service
const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { parsePagination, pageResult } = require('../libs/pagination');
const { CREDIT_NOTE_TYPES } = require('../libs/invoiceTypes');
const sequelize = require('../libs/sequelize');
const { purchInvoice, purchInvoiceLine, DocumentTax, seriesNumber } = sequelize.models;
const { SERIES_TYPES } = require('../db/models/SeriesNumber.model');

const PurchPostInvoiceService = require('./purchPostInvoice.service');
// Librería de cálculo unificada
const { calculateDocumentTotals } = require('../libs/taxCalculation');
const postService = new PurchPostInvoiceService();

// Facturas rectificativas (abonos): ClaveTipoFacturaType R1-R5, ver
// resources/verifactu-xsd/SuministroInformacion.xsd. Mismo criterio que
// libs/invoiceTypes.js -aquí en el lado borrador,
// para la página "Abonos de compra" (ver document-schema.mjs#purchInvoiceCreditNotes).

class purchInvoiceService {

  /**
   * Pagos del inicio de compras (ver stats.js#receivables): facturas de
   * compra en borrador sin pagar y, de ellas, las ya vencidas. Mismo
   * criterio que salesInvoices.service.js#getPendingCollectionSummary.
   */
  async getPendingPaymentSummary() {
    const pendingWhere = {
      status: { [Op.ne]: 'Pagado' },
      typeInvoice: { [Op.notIn]: CREDIT_NOTE_TYPES }
    };
    const totals = [
      [sequelize.fn('COUNT', sequelize.col('code')), 'count'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount_with_vat')), 0), 'total']
    ];

    const [pending, overdue] = await Promise.all([
      purchInvoice.findOne({ attributes: totals, where: pendingWhere, raw: true }),
      purchInvoice.findOne({
        attributes: totals,
        where: { ...pendingWhere, dueDate: { [Op.ne]: null, [Op.lt]: new Date() } },
        raw: true
      })
    ]);

    return {
      pending: { count: parseInt(pending.count, 10) || 0, total: parseFloat(pending.total) || 0 },
      overdue: { count: parseInt(overdue.count, 10) || 0, total: parseFloat(overdue.total) || 0 }
    };
  }

  async findPaginated({ limit, offset, searchTerm, filter }) {
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(limit, offset);

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['createdAt', 'DESC']], // Sincronizado a camelCase igual que en ventas
      where: {}
    };

    // 'creditNotes': solo rectificativas -> página "Abonos de compra".
    // 'invoicesOnly': lo contrario -> excluye los abonos de "Facturas de
    // compra" para no duplicar la información entre ambas páginas.
    if (filter === 'creditNotes') {
      options.where.typeInvoice = { [Op.in]: CREDIT_NOTE_TYPES };
    } else if (filter === 'invoicesOnly') {
      options.where.typeInvoice = { [Op.notIn]: CREDIT_NOTE_TYPES };
    } else if (filter === 'overdue') {
      // Página "Facturas de compra vencidas": facturas (sin abonos) sin pagar cuyo
      // vencimiento ya pasó, la más atrasada primero. Antes este filtro no
      // existía y la página mostraba el listado completo mezclado (pagadas,
      // sin vencer y abonos incluidos).
      options.where.typeInvoice = { [Op.notIn]: CREDIT_NOTE_TYPES };
      options.where.status = { [Op.ne]: 'Pagado' };
      options.where.dueDate = { [Op.ne]: null, [Op.lt]: new Date() };
      options.order = [['dueDate', 'ASC']];
    } else if (filter === 'pending') {
      // Tarjeta "Por pagar" del inicio de compras: mismo criterio que
      // getPendingPaymentSummary (sin abonos, sin pagar).
      options.where.typeInvoice = { [Op.notIn]: CREDIT_NOTE_TYPES };
      options.where.status = { [Op.ne]: 'Pagado' };
    }

    if (searchTerm) {
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { nif: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    try {
      const { count, rows } = await purchInvoice.findAndCountAll(options);
      return pageResult(rows, count, parsedOffset);
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
   * Registra un borrador: crea la factura registrada (numeración definitiva) y borra el borrador, TODO en una
   * transacción: o se hace entero o no se hace nada. Antes eran dos pasos
   * sueltos y, si fallaba el borrado, la factura quedaba registrada y en
   * borrador a la vez (y se podía volver a registrar).
   * El borrador se bloquea (SELECT ... FOR UPDATE) al empezar: un segundo
   * intento a la vez (doble clic, dos usuarios) espera y después ya no lo
   * encuentra.
   */
  async archiveInvoice(idOrCode, userId) {
    const isNumeric = !isNaN(idOrCode) && !isNaN(parseFloat(idOrCode));

    const whereCondition = isNumeric
      ? { id: idOrCode }
      : { code: idOrCode };

    const registered = await sequelize.transaction(async (transaction) => {
      const locked = await purchInvoice.findOne({ where: whereCondition, transaction, lock: transaction.LOCK.UPDATE });
      if (!locked) throw boom.notFound('La factura ya no está en borrador: puede que ya se haya registrado.');

      const invoice = await purchInvoice.findOne({
        where: { id: locked.id },
        include: [
          { model: purchInvoiceLine, as: 'lines' },
          { model: DocumentTax, as: 'taxes' }
        ],
        transaction
      });

      const invoiceData = invoice.get({ plain: true });

      // Preparar datos para el histórico de compras
      invoiceData.preInvoice = invoiceData.code;
      invoiceData.userName = userId; // camelCase de auditoría de compras

      // Serie de registro a usar: por defecto el valor congelado al crear el
      // borrador (compatibilidad con borradores antiguos sin seriesCode).
      let postingSerieCode = invoiceData.codePosting;

      // Si conocemos la serie borrador real usada (seriesCode persistido),
      // consultamos en vivo cuál es su postingSerie VIGENTE, por si un admin
      // la cambió después de crear el borrador.
      if (invoiceData.seriesCode) {
        const draftSeries = await seriesNumber.findOne({
          where: { code: invoiceData.seriesCode, type: SERIES_TYPES.purchinvoice.id },
          transaction
        });
        if (draftSeries?.postingSerie) {
          postingSerieCode = draftSeries.postingSerie;
        }
      }

      invoiceData.seriesCode = postingSerieCode;
      invoiceData.code = null;
      delete invoiceData.id;

      // Crear la registrada y borrar el borrador, en la misma transacción
      const created = await postService.create(invoiceData, { transaction });
      await invoice.destroy({ transaction });
      return created;
    });

    return postService.findOne(registered.code, { includeLines: true });
  }
}

module.exports = purchInvoiceService;
