const Joi = require('joi');

// Año del panel de inicio. Opcional: sin él, el service usa el año en curso.
// Entero acotado: el service lo interpola en SQL (EXTRACT(YEAR ...) = year).
const queryStatsSchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100),
});

// Inicio por módulos (ver stats.router.js /area/:area): el área y, como en
// el inicio completo, el año y un presupuesto opcional.
const areaParamsSchema = Joi.object({
  area: Joi.string().valid('sales', 'purchases', 'expenses').required(),
});

const queryAreaStatsSchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100),
  budget: Joi.string().trim().max(30),
});

module.exports = { queryStatsSchema, areaParamsSchema, queryAreaStatsSchema };
