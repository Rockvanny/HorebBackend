const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../libs/sequelize');

class StatsService {
  async getBarChartStats() {
    const { salesBudget, salesPostInvoice, purchpostInvoice } = sequelize.models;
    const year = new Date().getFullYear();

    try {
      const [budgets, sales, purchases, doughnutChart] = await Promise.all([
        this._getStats(salesBudget, year),
        this._getStats(salesPostInvoice, year),
        this._getStats(purchpostInvoice, year),
        this.getDoughnutStats(year) // Nuevo: Datos para la rosquilla
      ]);

      return {
        barChart: { budget: budgets, sales, purchases },
        doughnutChart: doughnutChart
      };
    } catch (error) {
      console.error("Error crítico en StatsService:", error);
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
   * Obtiene los gastos agrupados por categoría para el gráfico de dona
   */
  async getDoughnutStats(year) {
    const { purchpostInvoice } = sequelize.models;
    if (!purchpostInvoice) return { labels: [], values: [] };

    try {
      // Usamos el campo real 'post_date' que definimos en el esquema del histórico
      const results = await purchpostInvoice.findAll({
        attributes: [
          'category',
          [fn('SUM', col('amount_with_vat')), 'total']
        ],
        where: literal(`EXTRACT(YEAR FROM "post_date") = ${year}`),
        group: ['category'],
        raw: true
      });

      // Formateamos para que el Frontend lo reciba directamente
      const labels = results.map(row => row.category || 'Sin categoría');
      const values = results.map(row => parseFloat(row.total) || 0);

      return { labels, values };
    } catch (error) {
      console.error("Error en getDoughnutStats:", error);
      return { labels: [], values: [] };
    }
  }

  async _getStats(model, year) {
    if (!model) return Array(12).fill(0);

    const attr = model.rawAttributes.postingDate ||
      model.rawAttributes.posting_date ||
      model.rawAttributes.post_date ||
      model.rawAttributes.createdAt;

    const dateColumn = attr ? (attr.field || attr.fieldName) : 'created_at';

    try {
      const results = await model.findAll({
        attributes: [
          [fn('EXTRACT', literal(`MONTH FROM "${dateColumn}"`)), 'month'],
          [fn('SUM', col('amount_with_vat')), 'total']
        ],
        where: literal(`EXTRACT(YEAR FROM "${dateColumn}") = ${year}`),
        group: [literal('month')],
        raw: true
      });

      const data = new Array(12).fill(0);
      results.forEach(row => {
        const m = parseInt(row.month, 10) - 1;
        if (m >= 0 && m < 12) {
          data[m] = parseFloat(row.total) || 0;
        }
      });
      return data;
    } catch (err) {
      console.error(`Error en ${model.name}:`, err.message);
      return Array(12).fill(0);
    }
  }
}

module.exports = StatsService;
