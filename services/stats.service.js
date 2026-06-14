const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../libs/sequelize');

class StatsService {
  /**
   * 1. BÚSQUEDA POR DEFECTO (Global)
   * Trae todos los movimientos del año actual sin filtrar por presupuesto.
   */
  async getBarChartStats() {
    return this._getGeneralStats(null);
  }

  /**
   * 2. BÚSQUEDA CON FILTRO (Presupuesto específico)
   * Trae todos los movimientos del año para un código de presupuesto concreto.
   */
  async getStatsByBudget(budgetCode) {
    if (!budgetCode) return this.getBarChartStats();
    return this._getGeneralStats(budgetCode);
  }

  /**
   * Función maestra que centraliza la lógica de consulta.
   * Maneja la ejecución en paralelo de todas las métricas necesarias.
   */
  async _getGeneralStats(budgetCode = null) {
    const { salesBudget, salesPostInvoice, purchPostInvoice } = sequelize.models;
    const year = new Date().getFullYear();

    try {
      const [budgets, sales, purchases, doughnutChart] = await Promise.all([
        this._getStatsFiltered(salesBudget, year, budgetCode),
        this._getStatsFiltered(salesPostInvoice, year, budgetCode),
        this._getStatsFiltered(purchPostInvoice, year, budgetCode),
        this._getDoughnutFiltered(year, budgetCode)
      ]);

      return {
        barChart: { budget: budgets, sales, purchases },
        doughnutChart: doughnutChart
      };
    } catch (error) {
      console.error(`Error crítico en StatsService (Filtro: ${budgetCode}):`, error);
      return {
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
