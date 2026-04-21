const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const { salesPostInvoiceLine, salesPostInvoice } = sequelize.models;

class salesPostInvoiceLineService {
  constructor() { }

  /**
   * Consulta paginada de líneas (Read-only)
   */
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      // Orden por Documento y luego por número de línea
      order: [['code_document', 'ASC'], ['line_no', 'ASC']],
      where: {},
    };

    if (searchTerm) {
      options.where[Op.or] = [
        { codeDocument: { [Op.iLike]: `%${searchTerm}%` } },
        { codeItem: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    try {
      const { count, rows } = await salesPostInvoiceLine.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar líneas de facturas registradas', error);
    }
  }

  /**
   * Buscar una línea específica (PK Compuesta)
   */
  async findOne({ codeDocument, lineNo }, options = {}) {
    const queryOptions = {
      where: { codeDocument, lineNo },
      include: []
    };

    if (options.includeParent) {
      queryOptions.include.push({
        model: salesPostInvoice,
        as: 'parentDocument'
      });
    }

    const line = await salesPostInvoiceLine.findOne(queryOptions);
    if (!line) {
      throw boom.notFound(`Línea ${lineNo} del documento registrado ${codeDocument} no encontrada`);
    }
    return line;
  }

  /**
   * Creación de línea (Atómica e Inalterable)
   */
  async create(data, transaction = null) {
    const t = transaction || await sequelize.transaction();
    try {
      // Verificación de duplicados antes de insertar
      const existingLine = await salesPostInvoiceLine.findOne({
        where: {
          codeDocument: data.codeDocument,
          lineNo: data.lineNo
        },
        transaction: t
      });

      if (existingLine) {
        throw boom.conflict(`La línea ${data.lineNo} ya está registrada en el documento ${data.codeDocument}`);
      }

      const newLine = await salesPostInvoiceLine.create(data, { transaction: t });

      if (!transaction) await t.commit();
      return newLine;
    } catch (error) {
      if (!transaction && t) await t.rollback();
      if (error.isBoom) throw error;
      throw boom.badImplementation('Error al registrar la línea de factura', error);
    }
  }

  /**
   * NOTA: Los métodos update() y delete() han sido eliminados.
   * Una línea de factura registrada es un documento legal inalterable.
   */
}

module.exports = salesPostInvoiceLineService;
