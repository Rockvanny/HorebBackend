const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

// Extraemos los modelos necesarios
const {
  salesInvoice,
  salesInvoiceLine,
  salesPostInvoice,      // Necesario para el método archive
  salesPostInvoiceLine,  // Necesario para el método archive
} = sequelize.models;

class salesInvoiceService {
  constructor() { }

  /**
   * VALIDACIÓN PRIVADA: Consistencia Fiscal (Diferencia específica de Factura)
   */
  _validateFiscalConsistency(data) {
    const { typeInvoice, parentCode, rectificationType, amountWithVAT } = data;

    if (typeInvoice && typeInvoice.startsWith('R')) {
      if (!parentCode || parentCode.trim() === '') {
        throw boom.badRequest('Normativa AEAT: El campo parentCode es obligatorio para facturas rectificativas.');
      }
      if (!rectificationType) {
        throw boom.badRequest('Normativa AEAT: Debe indicar el tipo de rectificación (Sustitución o Diferencias).');
      }
    }

    if (typeInvoice === 'F1' && amountWithVAT < 0) {
      throw boom.badRequest('Una factura F1 no puede ser negativa. Cambie el tipo a R1 (Rectificativa).');
    }
  }

  // --- MÉTODOS ESPEJO DE BUDGET ---

  async countAll(filters = {}) {
    const { filter } = filters;
    const options = { where: {} };

    // Lógica de filtrado para el contador del Sidebar
    if (filter === 'overdue') {
      // 1. Misma fecha normalizada que usamos en el listado
      const todayStr = new Date().toLocaleDateString('en-CA');

      options.where[Op.and] = [
        // 2. Mismo cast para asegurar consistencia con la DB
        sequelize.where(
          sequelize.cast(sequelize.col('due_date'), 'DATE'),
          { [Op.lt]: todayStr }
        ),
        {
          status: { [Op.ne]: 'Pagado' }
        }
      ];
    }

    try {
      return await salesInvoice.count(options);
    } catch (error) {
      // Es buena práctica loguear el error interno para debug
      console.error('Error en countAll:', error);
      throw boom.badImplementation('Error al contar los registros');
    }
  }

  async findPaginated({ limit, offset, searchTerm, filter }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['created_at', 'DESC']],
      where: {},
    };

    // 1. Filtro de búsqueda por texto (SearchTerm)
    if (searchTerm) {
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { nif: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    // 2. Filtro de modo (Overdue / Vencidas)
    console.log('Aplicando filtro de facturas vencidas', filter);
    if (filter === 'overdue') {
      // 1. Obtenemos "Hoy" en formato YYYY-MM-DD
      // El formato 'en-CA' (Canadá) devuelve exactamente "2026-04-21"
      const todayStr = new Date().toLocaleDateString('en-CA');

      options.where[Op.and] = [
        // 2. Comparamos la columna de la BD (convertida a DATE puro)
        // contra el texto de hoy que enviamos desde Node
        sequelize.where(
          sequelize.cast(sequelize.col('due_date'), 'DATE'),
          { [Op.lt]: todayStr }
        ),
        {
          status: { [Op.ne]: 'Pagado' }
        }
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
      throw boom.badImplementation('Error al consultar registros paginados', error);
    }
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
    if (!record) throw boom.notFound('Registro no encontrado');
    return record.get({ plain: true });
  }

  async create(data) {
    const { lines, ...headerData } = data;
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
        await salesInvoiceLine.create({
          codeDocument: newInvoice.code,
          lineNo: 1,
          description: 'Nueva línea',
          quantity: 1,
          unitPrice: 0,
          amountLine: 0
        }, { transaction });
      }

      const updatedTotals = {
        amountWithoutVAT: totalNeto,
        amountVAT: totalIva,
        amountWithVAT: totalNeto + totalIva
      };

      this._validateFiscalConsistency({ ...newInvoice.toJSON(), ...updatedTotals });
      await newInvoice.update(updatedTotals, { transaction });

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
      if (!instance) throw boom.notFound('Registro no encontrado');

      const cleanHeader = { ...headerChanges };
      delete cleanHeader.id;
      delete cleanHeader.code;
      delete cleanHeader.createdAt;
      delete cleanHeader.updatedAt;

      await instance.update(cleanHeader, { transaction });

      if (lines) {
        await salesInvoiceLine.destroy({ where: { codeDocument: code }, transaction });
        if (lines.length > 0) {
          const linesToInsert = lines.map((line, index) => {
            const { id, ...lineData } = line;
            return {
              ...lineData,
              codeDocument: code,
              lineNo: line.lineNo || (index + 1),
              username: line.username || cleanHeader.username || 'system'
            };
          });
          await salesInvoiceLine.bulkCreate(linesToInsert, { transaction });
        } else {
          await salesInvoiceLine.create({
            codeDocument: code,
            lineNo: 1,
            description: 'Nueva línea',
            quantity: 1.0,
            unitPrice: 0.0,
            vat: 0.0,
            amountLine: 0.0,
            username: cleanHeader.username || 'Sistema'
          }, { transaction });
        }
      }

      await transaction.commit();
      return await this.findOne(code, { includeLines: true });
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async delete(code) {
    const instance = await salesInvoice.findByPk(code);
    if (!instance) throw boom.notFound('Registro no encontrado');
    await instance.destroy();
    return { code, message: 'Registro eliminado correctamente' };
  }

  /**
   * ACCIÓN ESPECÍFICA: Archivar Factura (Mover a histórico)
   */
  async archiveInvoice(code) {
    // Implementación mínima para que el router no falle
    // Aquí iría la lógica de pasar de salesInvoice a salesPostInvoice
    return { message: 'archivada', code };
  }
}

module.exports = salesInvoiceService;
