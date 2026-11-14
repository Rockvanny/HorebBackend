const { Op, UniqueConstraintError } = require('sequelize');
const boom = require('@hapi/boom');
const { parsePagination, pageResult } = require('../libs/pagination');
const { models } = require('../libs/sequelize');

// Modelos que guardan el nombre de la categoría (columna `category`, ver
// db/models/expenseCategory.model.js#categoryAttribute)
const USED_BY = ['Vendor', 'OperatingExpenses', 'purchInvoice', 'purchPostInvoice'];

const ORDER = [['sort_order', 'ASC'], ['name', 'ASC']];

class ExpenseCategoriesService {
  /**
   * Nombres de las categorías activas, en su orden, para los desplegables
   * (mismo formato que /enums: un array de textos). Con generalExpense,
   * solo las de gasto general (o solo las otras, si es false).
   */
  async options({ generalExpense } = {}) {
    const where = { active: true };
    if (generalExpense !== undefined) where.isGeneralExpense = generalExpense;
    const rows = await models.ExpenseCategory.findAll({ where, order: ORDER, attributes: ['name'] });
    return rows.map(r => r.name);
  }

  async findPaginated({ limit, offset, searchTerm }) {
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(limit, offset);
    const where = {};
    if (searchTerm?.trim()) where.name = { [Op.iLike]: `%${searchTerm.trim()}%` };

    const { count, rows } = await models.ExpenseCategory.findAndCountAll({
      where, order: ORDER, limit: parsedLimit, offset: parsedOffset
    });
    return pageResult(rows, count, parsedOffset);
  }

  async findOne(id) {
    const category = await models.ExpenseCategory.findByPk(id);
    if (!category) throw boom.notFound('Categoría no encontrada');
    return category;
  }

  async create(data) {
    try {
      return await models.ExpenseCategory.create(data);
    } catch (error) {
      throw this.#duplicate(error, data.name);
    }
  }

  /** Renombrar cambia el nombre en todos los registros (ON UPDATE CASCADE) */
  async update(id, changes) {
    const category = await this.findOne(id);
    try {
      return await category.update(changes);
    } catch (error) {
      throw this.#duplicate(error, changes.name);
    }
  }

  /**
   * Una categoría sin usar se elimina. Si algún registro la usa, se
   * desactiva en su lugar (decidido con el usuario 2026-11-14): deja de
   * ofrecerse, pero el histórico y las estadísticas no cambian.
   */
  async delete(id) {
    const category = await this.findOne(id);
    const counts = await Promise.all(USED_BY.map(model =>
      models[model].count({ where: { category: category.name } })));
    const uses = counts.reduce((sum, n) => sum + n, 0);

    if (uses > 0) {
      await category.update({ active: false });
      return {
        id: category.id,
        deactivated: true,
        message: `La categoría «${category.name}» está en uso en ${uses} registro${uses === 1 ? '' : 's'}: `
          + 'se ha desactivado en lugar de eliminarla. Ya no se ofrecerá al elegir categoría, '
          + 'pero los registros que la tienen la conservan. Puedes reactivarla desde su ficha.'
      };
    }

    await category.destroy();
    return { id: category.id, deleted: true, message: `Categoría «${category.name}» eliminada.` };
  }

  #duplicate(error, name) {
    if (error instanceof UniqueConstraintError) {
      return boom.conflict(`Ya existe una categoría llamada «${name}».`);
    }
    return error;
  }
}

module.exports = ExpenseCategoriesService;
