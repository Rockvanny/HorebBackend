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
    const { salesBudget, salesPostInvoice, purchpostInvoice } = sequelize.models;
    const year = new Date().getFullYear();

    try {
      const [budgets, sales, purchases, doughnutChart] = await Promise.all([
        this._getStatsFiltered(salesBudget, year, budgetCode),
        this._getStatsFiltered(salesPostInvoice, year, budgetCode),
        this._getStatsFiltered(purchpostInvoice, year, budgetCode),
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
    const { purchpostInvoice } = sequelize.models;
    if (!purchpostInvoice) return { labels: [], values: [] };

    const whereClause = {
      [Op.and]: [
        literal(`EXTRACT(YEAR FROM "post_date") = ${year}`)
      ]
    };

    if (budgetCode) {
      whereClause[Op.and].push({ budget_code: budgetCode });
    }

    try {
      const results = await purchpostInvoice.findAll({
        attributes: [
          'category',
          [fn('SUM', col('amount_with_vat')), 'total']
        ],
        where: whereClause,
        group: ['category'],
        raw: true
      });

      return {
        labels: results.map(row => row.category || 'Sin categoría'),
        values: results.map(row => parseFloat(row.total) || 0)
      };
    } catch (error) {
      console.error("Error en _getDoughnutFiltered:", error);
      return { labels: [], values: [] };
    }
  }
}

module.exports = StatsService;
