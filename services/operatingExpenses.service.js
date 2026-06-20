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
    // Aplicamos la validación financiera
    const validatedData = this.prepareAndValidateFinancials(data);

    const t = await models.OperatingExpenses.sequelize.transaction();
    try {
      const newExpense = await models.OperatingExpenses.create(validatedData, {
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

    // Si los cambios incluyen importes, los recalculamos/validamos
    const validatedChanges = this.prepareAndValidateFinancials({
        ...expense.dataValues, // Combinamos con los valores actuales
        ...changes             // Sobrescribimos con los nuevos cambios
    });

    return await expense.update(validatedChanges, { userExecutor });
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

  prepareAndValidateFinancials(data) {
    // Usamos los campos correctos definidos en tu schema: 'tax' y 'irpf'
    const base = parseFloat(data.baseAmount || 0);
    const taxPercent = parseFloat(data.tax || 0);  // Cambiado de taxPercentage
    const irpfPercent = parseFloat(data.irpf || 0); // Cambiado de irpfPercentage

    // 1. Recalculamos los importes
    const taxAmount = base * (taxPercent / 100);
    const amountIrpf = base * (irpfPercent / 100);

    // 2. Calculamos el total (Base + IVA - IRPF)
    const totalAmount = base + taxAmount - amountIrpf;

    // 3. Retornamos los datos con los nombres de campo exactos del modelo
    return {
      ...data,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      amountIrpf: parseFloat(amountIrpf.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2))
    };
  }

  /**
    * Obtiene los gastos operativos dentro de un rango de fechas.
    * Calcula el IVA implícito basado en los importes base y total.
    */
  async findForReport(startDate, endDate) {
    try {
      const expenses = await models.OperatingExpenses.findAll({
        where: {
          date: {
            [Op.gte]: new Date(startDate),
            [Op.lte]: new Date(endDate)
          }
        },
        order: [['date', 'ASC']]
      });

      return expenses.map(gasto => {
        return {
          fecha: gasto.date ? new Date(gasto.date).toLocaleDateString('es-ES') : '',
          numeroFactura: gasto.invoiceNumber || 'N/A',
          proveedor: gasto.name || '',
          cif: gasto.nif || '',
          concepto: gasto.concept || '',
          importe: parseFloat(gasto.baseAmount || 0),

          // Usamos los campos 'tax' e 'irpf' tal cual están en el schema
          ivaPorcentaje: parseFloat(gasto.tax || 0),
          irpfPorcentaje: parseFloat(gasto.irpf || 0),

          importeIva: parseFloat(gasto.taxAmount || 0),
          importeIrpf: parseFloat(gasto.amountIrpf || 0),
          total: parseFloat(gasto.totalAmount || 0),
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
