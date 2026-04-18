const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const sequelize = require('../libs/sequelize');

const {
  salesBudget,
  salesBudgetLine,
  Customer,
} = sequelize.models;

class salesBudgetService {

  constructor() { }

  async countAll() {
    try {
      return await salesBudget.count();
    } catch (error) {
      throw boom.badImplementation('Error al contar los registros', error);
    }
  }

  /**
   * Respuesta normalizada con 'records' para el Frontend
   */
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

    try {
      const { count, rows } = await salesBudget.findAndCountAll(options);
      return {
        records: rows, // Consistencia total con el front
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar registros paginados', error);
    }
  }

  async findOne(code, options = {}) {
    const { includeLines = false, includeCustomer = false } = options;

    const queryOptions = {
      include: []
    };

    if (includeCustomer) {
      queryOptions.include.push({ model: Customer, as: 'customer' });
    }

    if (includeLines) {
      queryOptions.include.push({
        model: salesBudgetLine,
        as: 'lines',
        separate: false
      });
    }

    const salesBudgetFound = await salesBudget.findByPk(code, queryOptions);
    if (!salesBudgetFound) {
      throw boom.notFound('Registro no encontrado');
    }
    return salesBudgetFound;
  }

  async create(data) {
    const { lines, ...headerData } = data; // Extraemos las líneas del payload
    const transaction = await sequelize.transaction();

    try {
      // 1. Crear cabecera (Aquí tu Hook de Sequelize genera el 'code' basado en la serie)
      const newSalesBudget = await salesBudget.create(headerData, { transaction });

      // 2. Si el front envió líneas, las guardamos usando el nuevo code generado
      if (lines && lines.length > 0) {
        const linesToInsert = lines.map((line, index) => ({
          ...line,
          codeBudget: newSalesBudget.code, // Vinculamos con la serie generada
          lineNo: index + 1
        }));
        await salesBudgetLine.bulkCreate(linesToInsert, { transaction });
      } else {
        // 3. Si no hay líneas, creamos la línea inicial por defecto (tu lógica original)
        const emptyLine = {
          codeBudget: newSalesBudget.code,
          lineNo: 1,
          description: 'Nueva línea',
          quantity: 1.0000,
          unitPrice: 0.0000,
          vat: 0.0000,
          amountLine: 0.0000,
          username: data.username || 'Sistema'
        };
        await salesBudgetLine.create(emptyLine, { transaction });
      }

      await transaction.commit();

      // Retornamos el documento completo para que el Front se actualice
      return await this.findOne(newSalesBudget.code, { includeLines: true });
    } catch (error) {
      if (transaction) await transaction.rollback();
      // ... manejo de errores existente
      throw error;
    }
  }

  async update(code, changes) {
    const { lines, ...headerChanges } = changes;
    const transaction = await sequelize.transaction();

    try {
      const instance = await salesBudget.findByPk(code, { transaction });
      if (!instance) throw boom.notFound('Registro no encontrado');

      // 1. Actualizar cabecera
      await instance.update(headerChanges, { transaction });

      // 2. Sincronizar líneas (Flush & Fill)
      if (lines) {
        await salesBudgetLine.destroy({
          where: { codeBudget: code },
          transaction
        });

        if (lines.length > 0) {
          const linesToInsert = lines.map((line, index) => ({
            ...line,
            codeBudget: code,
            lineNo: index + 1
          }));
          await salesBudgetLine.bulkCreate(linesToInsert, { transaction });
        }
      }

      await transaction.commit();
      return await this.findOne(code, { includeLines: true, includeCustomer: true });

    } catch (error) {
      if (transaction) await transaction.rollback();
      throw error;
    }
  }

  async delete(code) {
    const instance = await salesBudget.findByPk(code);
    if (!instance) throw boom.notFound('Registro no encontrado');

    // El ON DELETE CASCADE se encarga de las líneas
    await instance.destroy();
    return { code, message: 'Registro eliminado correctamente' };
  }
}

module.exports = salesBudgetService;
