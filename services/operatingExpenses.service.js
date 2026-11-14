const { Op, where, cast, col } = require('sequelize');
const boom = require('@hapi/boom');
const { parsePagination, pageResult } = require('../libs/pagination');
const { models } = require('../libs/sequelize');
const { isExpenseMonthClosed } = require('../libs/monthClose.helper');

/**
 * Gastos de empleados (entityType 'employee', nóminas): muestran el sueldo
 * de una persona, así que solo los ven y gestionan los administradores
 * (decidido con el usuario 2026-11-14). Para el resto es como si no
 * existieran, salvo en el Excel, donde van sumados por mes para que los
 * totales cuadren (ver findForReport).
 */
const isAdmin = (user) => (user?.role || '').toLowerCase() === 'admin';
const EMPLOYEE = 'employee';

class OperatingExpensesService {
  constructor() { }

  /** 404 (no 403) para no revelar que existe un gasto de empleado. */
  assertCanSee(expense, user) {
    if (expense.entityType === EMPLOYEE && !isAdmin(user)) throw boom.notFound('Gasto no encontrado');
  }

  assertCanUseEmployee(data, user) {
    if (data.entityType === EMPLOYEE && !isAdmin(user)) {
      throw boom.forbidden('Solo un administrador puede registrar gastos de empleados (nóminas).');
    }
  }

  /** El nº de empleado debe existir (referencia "blanda", sin FK). */
  async assertEmployeeExists(data) {
    if (data.entityType !== EMPLOYEE) return;
    const employee = await models.Employee.findOne({ where: { employeeNo: data.entityCode } });
    if (!employee) throw boom.badRequest(`No existe ningún empleado con el número '${data.entityCode}'.`);
  }

  async findPaginated({ limit, offset, startDate, endDate, category, searchTerm, user }) {
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(limit, offset);

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['date', 'DESC']],
      where: {},
    };

    if (!isAdmin(user)) options.where.entityType = { [Op.ne]: EMPLOYEE };
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
        // category es un ENUM de Postgres: ILIKE solo funciona sobre texto
        // (sin el cast, cualquier búsqueda daba error 500)
        where(cast(col('category'), 'text'), { [Op.iLike]: searchPattern }),
        { name: { [Op.iLike]: searchPattern } }
      ];
    }

    try {
      const { count, rows } = await models.OperatingExpenses.findAndCountAll(options);
      return pageResult(rows, count, parsedOffset);
    } catch (error) {
      throw boom.badImplementation('Error al consultar gastos paginados');
    }
  }

  /**
   * Resumen de solo lectura para la pantalla "Gestión" de la app móvil
   * (exclusiva de admin, ver checkRole en el router): igual filtro de fecha
   * que findPaginated (solo si vienen AMBAS, si no no filtra), pero
   * simplificado a los campos que interesan en una tarjeta -sin el desglose
   * de IVA/IRPF que sí necesita el Frontend Electron-.
   */
  async findMobileSummary({ startDate, endDate }) {
    const options = {
      order: [['date', 'DESC']],
      where: {},
      attributes: ['id', 'date', 'category', 'name', 'concept', 'totalAmount']
    };

    if (startDate && endDate) {
      options.where.date = { [Op.between]: [startDate, endDate] };
    }

    const expenses = await models.OperatingExpenses.findAll(options);
    return expenses.map((expense) => ({
      id: expense.id,
      date: expense.date,
      category: expense.category,
      vendorName: expense.name,
      concept: expense.concept,
      totalAmount: parseFloat(expense.totalAmount || 0)
    }));
  }

  /**
   * Detalle completo para el modal de la app móvil (se abre al tocar una
   * fila de "Gastos internos"): mismo gasto que findMobileSummary pero con
   * el desglose de IVA/IRPF y el proveedor -findMobileSummary se queda corto
   * a propósito para la tarjeta de lista, aquí sí interesa el detalle-.
   */
  async findMobileDetail(id) {
    const expense = await this.findOne(id);
    return {
      id: expense.id,
      date: expense.date,
      category: expense.category,
      vendorName: expense.name,
      nif: expense.nif,
      concept: expense.concept,
      baseAmount: parseFloat(expense.baseAmount || 0),
      tax: parseFloat(expense.tax || 0),
      taxAmount: parseFloat(expense.taxAmount || 0),
      irpf: parseFloat(expense.irpf || 0),
      amountIrpf: parseFloat(expense.amountIrpf || 0),
      totalAmount: parseFloat(expense.totalAmount || 0),
      paymentMethod: expense.paymentMethod
    };
  }

  async findOne(id, user = null) {
    const expense = await models.OperatingExpenses.findByPk(id);
    if (!expense) throw boom.notFound('Gasto no encontrado');
    // user null: llamadas internas o de la app móvil (ya solo admin)
    if (user) this.assertCanSee(expense, user);
    return expense;
  }

  async create(data, userExecutor, user = null) {
    this.assertCanUseEmployee(data, user);
    await this.assertEmployeeExists(data);

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

  async update(id, changes, userExecutor, user = null) {
    const expense = await this.findOne(id, user);
    this.assertEditable(expense);
    const merged = { ...expense.dataValues, ...changes };
    this.assertCanUseEmployee(merged, user);
    if (changes.entityType !== undefined || changes.entityCode !== undefined) {
      await this.assertEmployeeExists(merged);
    }

    // Si los cambios incluyen importes, los recalculamos/validamos
    const validatedChanges = this.prepareAndValidateFinancials({
        ...expense.dataValues, // Combinamos con los valores actuales
        ...changes             // Sobrescribimos con los nuevos cambios
    });

    return await expense.update(validatedChanges, { userExecutor });
  }

  async delete(id, userExecutor, user = null) {
    const expense = await this.findOne(id, user);
    this.assertEditable(expense);

    await expense.destroy({ userExecutor });
    return { id };
  }

  /** Cerrado: validado o de un mes ya terminado. */
  isLocked(expense) {
    return !!expense.isValidated || isExpenseMonthClosed(expense.date);
  }

  /**
   * Un gasto deja de poder tocarse si ya fue validado manualmente, o si su
   * mes calendario ya finalizó (cierre automático por fecha). Los ajustes
   * de corrección tampoco: son el registro de la corrección (ver correct).
   */
  assertEditable(expense) {
    if (expense.correctsId) {
      throw boom.conflict('Es un ajuste de corrección: no se puede modificar ni eliminar.');
    }
    if (expense.isValidated) {
      throw boom.conflict('No se puede modificar: el gasto ya ha sido validado.');
    }
    if (isExpenseMonthClosed(expense.date)) {
      throw boom.conflict('No se puede modificar: el mes de este gasto ya ha finalizado.');
    }
  }

  /**
   * Corrige un gasto CERRADO sin tocarlo: crea en el mes abierto (fecha de
   * hoy) un gasto de ajuste con sus importes en negativo, enlazado al
   * original (correctsId) y con el motivo. El mes cerrado (estadísticas y
   * Excel ya entregado a la gestoría) no cambia; el ajuste sale en el mes
   * actual. Después el usuario registra, si hace falta, el gasto correcto
   * como uno nuevo. Un gasto solo se corrige una vez; un ajuste no se
   * corrige. Las nóminas de empleados, solo un administrador.
   */
  async correct(id, reason, userExecutor, user) {
    const original = await this.findOne(id, user);
    if (original.correctsId) throw boom.conflict('Un ajuste de corrección no se puede corregir.');
    if (!this.isLocked(original)) {
      throw boom.conflict('El gasto aún está abierto: modifícalo directamente.');
    }
    this.assertCanUseEmployee(original, user);
    const existing = await models.OperatingExpenses.findOne({ where: { correctsId: original.id } });
    if (existing) throw boom.conflict(`Este gasto ya se corrigió (ajuste #${existing.id}).`);

    const today = new Date().toISOString().slice(0, 10);
    const originalDate = new Date(original.date).toLocaleDateString('es-ES');
    const concept = `Ajuste del gasto #${original.id} (${originalDate}): ${reason}`.slice(0, 255);
    return this.create({
      date: today,
      category: original.category,
      entityType: original.entityType,
      entityCode: original.entityCode,
      name: original.name,
      nif: original.nif,
      concept,
      baseAmount: -parseFloat(original.baseAmount || 0),
      tax: parseFloat(original.tax || 0),
      irpf: parseFloat(original.irpf || 0),
      paymentMethod: original.paymentMethod,
      correctsId: original.id,
      correctionReason: reason
    }, userExecutor, user);
  }

  /**
   * Relación de corrección para la ficha: si el gasto fue corregido (su
   * ajuste) o si él mismo es un ajuste (el gasto que corrige).
   */
  async getCorrectionInfo(expense) {
    const pick = (e) => e && { id: e.id, date: e.date, concept: e.concept, totalAmount: e.totalAmount, userName: e.userName, reason: e.correctionReason, createdAt: e.createdAt };
    const [adjustment, original] = await Promise.all([
      models.OperatingExpenses.findOne({ where: { correctsId: expense.id } }),
      expense.correctsId ? models.OperatingExpenses.findByPk(expense.correctsId) : null
    ]);
    return { correctedBy: pick(adjustment), corrects: pick(original) };
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
  async findForReport(startDate, endDate, user = null) {
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

      const toRow = (gasto) => {
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
      };

      if (isAdmin(user)) return expenses.map(toRow);

      // Sin ser admin: las nóminas de empleados se suman en una línea por
      // mes ("Nóminas"), sin nombres ni importes individuales.
      const rows = [];
      const payrollByMonth = new Map();
      for (const gasto of expenses) {
        if (gasto.entityType !== EMPLOYEE) { rows.push(toRow(gasto)); continue; }
        const d = new Date(gasto.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!payrollByMonth.has(key)) {
          const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
          const row = {
            fecha: lastDay.toLocaleDateString('es-ES'), numeroFactura: 'N/A',
            proveedor: 'Nóminas (detalle solo para administradores)', cif: '',
            concepto: `Nóminas ${d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`,
            importe: 0, ivaPorcentaje: 0, irpfPorcentaje: 0, importeIva: 0, importeIrpf: 0, total: 0,
            categoria: 'Personal y Nóminas', _date: lastDay
          };
          payrollByMonth.set(key, row);
          rows.push(row);
        }
        const row = payrollByMonth.get(key);
        row.importe += parseFloat(gasto.baseAmount || 0);
        row.importeIva += parseFloat(gasto.taxAmount || 0);
        row.importeIrpf += parseFloat(gasto.amountIrpf || 0);
        row.total += parseFloat(gasto.totalAmount || 0);
      }
      const round = (n) => Math.round(n * 100) / 100;
      return rows.map(({ _date, ...row }) => _date
        ? { ...row, importe: round(row.importe), importeIva: round(row.importeIva), importeIrpf: round(row.importeIrpf), total: round(row.total) }
        : row);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OperatingExpensesService;
