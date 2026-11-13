const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../libs/sequelize');
const logger = require('../libs/logger');

class StatsService {
  /**
   * 1. BÚSQUEDA POR DEFECTO (Global)
   * Trae todos los movimientos del año (por defecto el actual) sin filtrar
   * por presupuesto.
   */
  async getBarChartStats(year) {
    return this._getGeneralStats(null, year);
  }

  /**
   * 2. BÚSQUEDA CON FILTRO (Presupuesto específico)
   * Trae todos los movimientos del año para un código de presupuesto concreto.
   */
  async getStatsByBudget(budgetCode, year) {
    if (!budgetCode) return this.getBarChartStats(year);
    return this._getGeneralStats(budgetCode, year);
  }

  /**
   * Función maestra que centraliza la lógica de consulta.
   * Maneja la ejecución en paralelo de todas las métricas necesarias.
   */
  _resolveYear(requestedYear) {
    // Se interpola en SQL (EXTRACT(YEAR ...) = year): solo enteros (el router
    // ya lo valida con Joi, ver schemas/stats.schema.js; esto es la segunda
    // barrera).
    return Number.isInteger(Number(requestedYear)) && requestedYear
      ? Number(requestedYear)
      : new Date().getFullYear();
  }

  /**
   * Inicio por módulos: usuarios SIN el módulo Reportes, que no pueden ver
   * el inicio completo (ver stats.router.js /area/:area). Cada área devuelve
   * solo sus datos, con la misma forma que _getGeneralStats para que el
   * frontend pinte igual (y combine varias áreas si el usuario las tiene):
   *  - sales:     barras de presupuestos y facturado; dona de facturado por
   *               cliente.
   *  - purchases: barras de compras; dona de compras por categoría.
   *  - expenses:  barras y dona de gastos operativos (base imponible, sin
   *               IVA, igual que en el inicio completo). No se ligan a un
   *               presupuesto: con uno filtrado no hay datos.
   */
  async getAreaStats(area, requestedYear = null, budgetCode = null) {
    const { salesBudget, salesPostInvoice, purchPostInvoice } = sequelize.models;
    const year = this._resolveYear(requestedYear);

    try {
      if (area === 'sales') {
        const [budget, sales, doughnutChart] = await Promise.all([
          this._getStatsFiltered(salesBudget, year, budgetCode),
          this._getStatsFiltered(salesPostInvoice, year, budgetCode),
          this._getSalesByCustomer(year, budgetCode)
        ]);
        return { year, area, barChart: { budget, sales }, doughnutChart };
      }

      if (area === 'purchases') {
        const [purchases, doughnutChart] = await Promise.all([
          this._getStatsFiltered(purchPostInvoice, year, budgetCode),
          this._getPurchasesByCategory(year, budgetCode)
        ]);
        return { year, area, barChart: { purchases }, doughnutChart };
      }

      // expenses
      if (budgetCode) {
        return { year, area, barChart: { operating: Array(12).fill(0) }, doughnutChart: { labels: [], values: [] } };
      }
      const [operating, doughnutChart] = await Promise.all([
        this._getOperatingByMonth(year),
        this._getOperatingByCategory(year)
      ]);
      return { year, area, barChart: { operating }, doughnutChart };
    } catch (error) {
      logger.error(`StatsService.getAreaStats (${area}, presupuesto ${budgetCode || 'todos'}): ${error.message}`, { stack: error.stack });
      return { year, area, barChart: {}, doughnutChart: { labels: [], values: [] } };
    }
  }

  /** Facturado por cliente: los 6 primeros y el resto sumado en "Otros clientes". */
  async _getSalesByCustomer(year, budgetCode) {
    const { salesPostInvoice } = sequelize.models;
    const where = { [Op.and]: [literal(`EXTRACT(YEAR FROM "posting_date") = ${year}`)] };
    if (budgetCode) where.budget_code = budgetCode;

    const rows = await salesPostInvoice.findAll({
      attributes: ['name', [fn('SUM', col('amount_with_vat')), 'total']],
      where,
      group: ['name'],
      raw: true
    });

    const sorted = rows
      .map(r => ({ label: r.name || 'Sin nombre', value: parseFloat(r.total) || 0 }))
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6).reduce((acc, r) => acc + r.value, 0);
    if (rest > 0) top.push({ label: 'Otros clientes', value: rest });

    return { labels: top.map(r => r.label), values: top.map(r => r.value) };
  }

  /** Compras registradas por categoría (sin gastos operativos: son del módulo Gestión). */
  async _getPurchasesByCategory(year, budgetCode) {
    const { purchPostInvoice } = sequelize.models;
    const where = { [Op.and]: [literal(`EXTRACT(YEAR FROM "posting_date") = ${year}`)] };
    if (budgetCode) where.budget_code = budgetCode;

    const rows = await purchPostInvoice.findAll({
      attributes: ['category', [fn('SUM', col('amount_with_vat')), 'total']],
      where,
      group: ['category'],
      raw: true
    });
    return {
      labels: rows.map(r => r.category || 'Sin categoría'),
      values: rows.map(r => parseFloat(r.total) || 0)
    };
  }

  async _getOperatingByMonth(year) {
    const { OperatingExpenses } = sequelize.models;
    const rows = await OperatingExpenses.findAll({
      attributes: [
        [fn('EXTRACT', literal('MONTH FROM "date"')), 'month'],
        [fn('SUM', col('base_amount')), 'total']
      ],
      where: { [Op.and]: [literal(`EXTRACT(YEAR FROM "date") = ${year}`)] },
      group: [literal('month')],
      raw: true
    });
    const data = Array(12).fill(0);
    rows.forEach(row => {
      const m = parseInt(row.month, 10) - 1;
      if (m >= 0 && m < 12) data[m] = parseFloat(row.total) || 0;
    });
    return data;
  }

  async _getOperatingByCategory(year) {
    const { OperatingExpenses } = sequelize.models;
    const rows = await OperatingExpenses.findAll({
      attributes: ['category', [fn('SUM', col('base_amount')), 'total']],
      where: { [Op.and]: [literal(`EXTRACT(YEAR FROM "date") = ${year}`)] },
      group: ['category'],
      raw: true
    });
    return {
      labels: rows.map(r => r.category || 'Sin categoría'),
      values: rows.map(r => parseFloat(r.total) || 0)
    };
  }

  async _getGeneralStats(budgetCode = null, requestedYear = null) {
    const { salesBudget, salesPostInvoice, purchPostInvoice } = sequelize.models;
    const year = this._resolveYear(requestedYear);

    try {
      const [budgets, sales, purchases, doughnutChart] = await Promise.all([
        this._getStatsFiltered(salesBudget, year, budgetCode),
        this._getStatsFiltered(salesPostInvoice, year, budgetCode),
        this._getStatsFiltered(purchPostInvoice, year, budgetCode),
        this._getDoughnutFiltered(year, budgetCode)
      ]);

      return {
        year,
        barChart: { budget: budgets, sales, purchases },
        doughnutChart: doughnutChart
      };
    } catch (error) {
      logger.error(`StatsService (presupuesto ${budgetCode || 'todos'}): ${error.message}`, { stack: error.stack });
      return {
        year,
        barChart: {
          budget: Array(12).fill(0),
          sales: Array(12).fill(0),
          purchases: Array(12).fill(0)
        },
        doughnutChart: { labels: [], values: [] }
      };
    }
  }

  /**
   * Lógica filtrada para gráficos de barras (Series temporales mensuales)
   * Adaptado específicamente para la sintaxis de PostgreSQL.
   */
  async _getStatsFiltered(model, year, budgetCode) {
    if (!model) return Array(12).fill(0);

    // Detección automática de la columna de fecha según el modelo
    const attr = model.rawAttributes.postingDate ||
      model.rawAttributes.posting_date ||
      model.rawAttributes.post_date ||
      model.rawAttributes.createdAt;

    const dateColumn = attr ? (attr.field || attr.fieldName) : 'created_at';

    // AJUSTE DE CAMPOS: 'code' para la cabecera del presupuesto, 'budget_code' para las líneas/facturas
    const codeColumn = (model.name === 'salesBudget') ? 'code' : 'budget_code';

    const whereClause = {
      [Op.and]: [
        // Uso de comillas dobles en literal para asegurar compatibilidad con Postgres
        literal(`EXTRACT(YEAR FROM "${dateColumn}") = ${year}`)
      ]
    };

    // Si se recibe un código de presupuesto, se inyecta en el AND
    if (budgetCode) {
      whereClause[Op.and].push({ [codeColumn]: budgetCode });
    }

    const results = await model.findAll({
      attributes: [
        [fn('EXTRACT', literal(`MONTH FROM "${dateColumn}"`)), 'month'],
        [fn('SUM', col('amount_with_vat')), 'total']
      ],
      where: whereClause,
      group: [literal('month')],
      raw: true
    });

    // Inicializamos array de 12 meses y rellenamos con resultados
    const data = new Array(12).fill(0);
    results.forEach(row => {
      const m = parseInt(row.month, 10) - 1;
      if (m >= 0 && m < 12) {
        data[m] = parseFloat(row.total) || 0;
      }
    });
    return data;
  }

  /**
   * Lógica filtrada para el gráfico de dona (Categorías de gasto)
   */
  async _getDoughnutFiltered(year, budgetCode) {
    const { purchPostInvoice, OperatingExpenses } = sequelize.models;

    // 1. Si hay filtro de presupuesto: Solo mostramos facturas de compra (categorizadas)
    if (budgetCode) {
      const results = await purchPostInvoice.findAll({
        attributes: ['category', [fn('SUM', col('amount_with_vat')), 'total']],
        where: {
          budget_code: budgetCode,
          [Op.and]: [literal(`EXTRACT(YEAR FROM "posting_date") = ${year}`)]
        },
        group: ['category'],
        raw: true
      });
      return {
        labels: results.map(r => r.category || 'Sin categoría'),
        values: results.map(r => parseFloat(r.total) || 0)
      };
    }

    // 2. Si es VISTA GLOBAL: Sumamos categorías de compras Y globalizamos OperatingExpenses
    const [purchases, totalOperating] = await Promise.all([
      purchPostInvoice.findAll({
        attributes: ['category', [fn('SUM', col('amount_with_vat')), 'total']],
        where: { [Op.and]: [literal(`EXTRACT(YEAR FROM "posting_date") = ${year}`)] },
        group: ['category'],
        raw: true
      }),

      OperatingExpenses.findOne({
        attributes: [[fn('SUM', col('base_amount')), 'total']], // Suma total de todos los gastos
        where: { [Op.and]: [literal(`EXTRACT(YEAR FROM "date") = ${year}`)] },
        raw: true
      })
    ]);

    // Construimos los resultados
    const labels = purchases.map(r => r.category || 'Sin categoría');
    const values = purchases.map(r => parseFloat(r.total) || 0);

    // Añadimos la categoría global de Gastos Operativos
    labels.push('Gastos Operativos');
    values.push(parseFloat(totalOperating?.total || 0));

    return { labels, values };
  }
}

module.exports = StatsService;
