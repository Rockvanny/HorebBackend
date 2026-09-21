const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');
const { salesInvoice, salesInvoiceLine, DocumentTax, seriesNumber } = sequelize.models;
const { SERIES_TYPES } = require('../db/models/SeriesNumber.model');

const SalesPostInvoiceService = require('./salesPostInvoice.service');
// IMPORTANTE: Cambiamos a la librería correcta y función correcta
const { calculateDocumentTotals } = require('../libs/taxCalculation');
const postService = new SalesPostInvoiceService();

// Facturas rectificativas (abonos): ClaveTipoFacturaType R1-R5, ver
// resources/verifactu-xsd/SuministroInformacion.xsd. Mismo criterio que
// salesPostInvoice.service.js#CREDIT_NOTE_TYPES -aquí en el lado borrador,
// para la página "Abonos de venta" (ver document-schema.mjs#salesInvoiceCreditNotes).
const CREDIT_NOTE_TYPES = ['R1', 'R2', 'R3', 'R4', 'R5'];

// Ventana de "próxima a vencer" para el to-do del dashboard móvil de admin
// (decidido con el usuario, ver AndroidApp/TODO.md): más allá de estos días
// no se considera todavía urgente, para no saturar la lista de tarjetas.
const DASHBOARD_TODO_UPCOMING_DAYS = 7;

class salesInvoiceService {

  /**
   * "To-do" simplificado para el dashboard de admin de la app móvil:
   * facturas BORRADOR (`sales_invoices`, no `sales_post_invoices`) que
   * siguen sin registrarse/cobrarse y ya están vencidas o próximas a vencer
   * (dentro de DASHBOARD_TODO_UPCOMING_DAYS), con status='Abierto' -una
   * pagada ya no es un pendiente-. Es justo la alerta de "esto sigue en
   * borrador y no se ha cobrado": una vez archivada (archiveInvoice) pasa a
   * sales_post_invoices y deja de salir aquí. Sin paginar a propósito: es
   * una lista de tarjetas resumidas, no el listado completo (ver
   * findPaginated#filter, que sigue sin implementar el filtro 'overdue' del
   * Frontend -no se tocó aquí, es un problema distinto y no pedido-).
   */
  async findDashboardTodo() {
    const now = new Date();
    const upcomingLimit = new Date(now.getTime() + DASHBOARD_TODO_UPCOMING_DAYS * 24 * 60 * 60 * 1000);

    const rows = await salesInvoice.findAll({
      where: {
        status: 'Abierto',
        dueDate: { [Op.ne]: null, [Op.lte]: upcomingLimit }
      },
      order: [['due_date', 'ASC']],
      attributes: ['code', 'name', 'dueDate', 'amountWithVAT']
    });

    return rows.map((row) => ({
      code: row.code,
      customerName: row.name,
      dueDate: row.dueDate,
      amountWithVAT: parseFloat(row.amountWithVAT),
      overdue: new Date(row.dueDate).getTime() < now.getTime()
    }));
  }

  async findPaginated({ limit, offset, searchTerm, filter }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['createdAt', 'DESC']],
      where: {}
    };

    // 'creditNotes': solo rectificativas -> página "Abonos de venta".
    // 'invoicesOnly': lo contrario -> excluye los abonos de "Facturas de
    // venta" para no duplicar la información entre ambas páginas (mismo
    // criterio que salesPostInvoice.service.js#findPaginated).
    if (filter === 'creditNotes') {
      options.where.typeInvoice = { [Op.in]: CREDIT_NOTE_TYPES };
    } else if (filter === 'invoicesOnly') {
      options.where.typeInvoice = { [Op.notIn]: CREDIT_NOTE_TYPES };
    }

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

  /**
   * Busca facturas (borrador) por código de cliente. Equivalente exacto a
   * purchInvoice.service.js#findByVendor -antes no existía, y la ruta
   * GET /salesInvoices/by-customer/:entityCode que la invoca devolvía un
   * 500 en cuanto se llamaba-.
   */
  async findByCustomer(entityCode) {
    if (!entityCode || entityCode === 'undefined' || entityCode === 'null') {
      return [];
    }

    try {
      return await salesInvoice.findAll({
        where: { entityCode },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      throw boom.badImplementation('Error al buscar facturas por cliente', error);
    }
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
        const linesToInsert = processedLines.map(l => {
          const { id, ...cleanLine } = l; // <-- Extraemos y descartamos el id de la línea
          return {
            ...cleanLine,
            codeDocument: instance.code
          };
        });
        await salesInvoiceLine.bulkCreate(linesToInsert, { transaction });

        const taxesToInsertClean = taxesToInsert.map(t => {
          const { id, ...cleanTax } = t; // <-- Extraemos y descartamos el id del impuesto
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

  async archiveInvoice(idOrCode, userId) {
    // 1. Detectar si el valor recibido es numérico (ID) o string (Code)
    const isNumeric = !isNaN(idOrCode) && !isNaN(parseFloat(idOrCode));

    // 2. Construir la condición dinámica
    const whereCondition = isNumeric
      ? { id: idOrCode }
      : { code: idOrCode };

    // 3. Buscar la factura
    const invoice = await salesInvoice.findOne({
      where: whereCondition,
      include: [
        { model: salesInvoiceLine, as: 'lines' },
        { model: DocumentTax, as: 'taxes' }
      ]
    });

    if (!invoice) throw boom.notFound('Factura no encontrada');

    const invoiceData = invoice.get({ plain: true });

    // 4. Preparar datos para el histórico
    invoiceData.preInvoice = invoiceData.code; // Guardamos el código original
    invoiceData.username = userId;

    // Serie de registro a usar: por defecto el valor congelado al crear el
    // borrador (compatibilidad con borradores antiguos sin seriesCode).
    let postingSerieCode = invoiceData.codePosting;

    // Si conocemos la serie borrador real usada (seriesCode persistido),
    // consultamos en vivo cuál es su postingSerie VIGENTE, por si un admin
    // la cambió después de crear el borrador.
    if (invoiceData.seriesCode) {
      const draftSeries = await seriesNumber.findOne({
        where: { code: invoiceData.seriesCode, type: SERIES_TYPES.salesinvoice.id }
      });
      if (draftSeries?.postingSerie) {
        postingSerieCode = draftSeries.postingSerie;
      }
    }

    invoiceData.seriesCode = postingSerieCode;
    invoiceData.code = null; // Se anula para que la nueva tabla genere su propio código si es necesario
    delete invoiceData.id;   // Eliminamos el ID antiguo para evitar conflictos de Primary Key en la tabla destino

    // 5. Crear en la tabla de facturas registradas y borrar de la temporal
    const result = await postService.create(invoiceData);

    if (result) {
      await invoice.destroy();
    }

    return result;
  }
}

module.exports = salesInvoiceService;
