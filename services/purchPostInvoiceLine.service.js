const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const { purchPostInvoiceLine, purchPostInvoice } = sequelize.models;

class PurchPostInvoiceLineService {

  // 1. Consulta paginada (Efecto espejo con ventas)
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      // Ordenamos por documento y luego por número de línea
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
      const { count, rows } = await purchPostInvoiceLine.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar líneas del histórico de compras', error);
    }
  }

  // 2. Buscar por ID único (ID técnico autoincremental)
  async findOneById(id) {
    const line = await purchPostInvoiceLine.findByPk(id, {
      include: [{
        model: purchPostInvoice,
        as: 'parentInvoice' // Alias definido en la asociación del modelo
      }]
    });

    if (!line) throw boom.notFound('Línea de histórico de compra no encontrada');
    return line;
  }

  // 3. Crear línea (Usado por el servicio de cabecera)
  async create(data, transaction = null) {
    try {
      // Nota: La validación de duplicados (codeDocument + lineNo)
      // la hace la BD gracias al índice único que pusimos en la migración.
      return await purchPostInvoiceLine.create(data, { transaction });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw boom.conflict('La línea ya existe para este documento');
      }
      throw error;
    }
  }

  /**
   * REGLA DE NEGOCIO:
   * Al ser un histórico de facturas registradas, no se implementan
   * métodos de UPDATE ni DELETE para asegurar la integridad contable.
   */
}

module.exports = PurchPostInvoiceLineService;
