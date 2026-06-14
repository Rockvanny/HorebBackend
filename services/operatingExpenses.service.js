const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class OperatingExpensesService {
  constructor() { }

  async findPaginated({ limit, offset, startDate, endDate, category, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['date', 'DESC']],
      where: {},
    };

    if (startDate && endDate) {
      options.where.date = { [Op.between]: [startDate, endDate] };
    }
    if (category) {
      options.where.category = category;
    }
    if (searchTerm) {
      const term = searchTerm.trim();
      const searchPattern = term.includes('%') ? term : `%${term}%`;
      options.where[Op.or] = [
        { concept: { [Op.iLike]: searchPattern } },
        { category: { [Op.iLike]: searchPattern } }
      ];
    }

    try {
      const { count, rows } = await models.OperatingExpenses.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar gastos paginados');
    }
  }

  async findOne(id) {
    const expense = await models.OperatingExpenses.findByPk(id);
    if (!expense) throw boom.notFound('Gasto no encontrado');
    return expense;
  }

  async create(data, userExecutor) {
    const t = await models.OperatingExpenses.sequelize.transaction();
    try {
      const newExpense = await models.OperatingExpenses.create(data, {
        transaction: t,
        userExecutor
      });
      await t.commit();
      return newExpense;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async update(id, changes, userExecutor) {
    const expense = await this.findOne(id);
    return await expense.update(changes, { userExecutor });
  }

  async delete(id, userExecutor) {
    const expense = await this.findOne(id);

    // Validación de lógica de negocio antes de eliminar
    if (expense.isValidated) {
      throw boom.conflict('No se puede eliminar: el gasto ya ha sido validado.');
    }

    await expense.destroy({ userExecutor });
    return { id };
  }

  async validatePreviousMonth(userExecutor) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    try {
      const [updatedCount] = await models.OperatingExpenses.update(
        { isValidated: true },
        {
          where: {
            date: { [Op.between]: [firstDay, lastDay] },
            isValidated: false
          },
          userExecutor // Pasamos el usuario para auditoría si el hook lo requiere
        }
      );
      return { message: "Proceso completado", updatedCount };
    } catch (error) {
      throw boom.badImplementation('Error al validar mes anterior');
    }
  }

  /**
    * Obtiene los gastos operativos dentro de un rango de fechas.
    * Calcula el IVA implícito basado en los importes base y total.
    */
  async findForReport(startDate, endDate) {
    try {
      // CORRECCIÓN: Cambiamos 'OperatingExpenses' por 'models.OperatingExpenses'
      const expenses = await models.OperatingExpenses.findAll({
        where: {
          date: {
            [Op.gte]: new Date(startDate), // >= fecha inicio
            [Op.lte]: new Date(endDate)    // <= fecha fin
          }
        },
        order: [['date', 'ASC']]
      });

      console.log(`[OperatingExpensesService] Gastos encontrados entre ${startDate} y ${endDate}:`, expenses.length);

      return expenses.map(gasto => {
        const base = parseFloat(gasto.baseAmount || 0);
        const iva = parseFloat(gasto.taxAmount || 0);

        const ivaPorcentaje = (base > 0)
          ? parseFloat(((iva / base) * 100).toFixed(2))
          : 0;

        return {
          fecha: gasto.date ? new Date(gasto.date).toLocaleDateString('es-ES') : '',
          numeroFactura: 'N/A',
          proveedor: gasto.name || '',
          cif: gasto.nif || '',
          concepto: gasto.concept || '',
          importe: base,
          ivaPorcentaje: ivaPorcentaje,
          categoria: gasto.category || 'Sin categoría'
        };
      });

    } catch (error) {
      console.error("[OperatingExpensesService] Error en findForReport:", error);
      throw error;
    }
  }
}

module.exports = OperatingExpensesService;
