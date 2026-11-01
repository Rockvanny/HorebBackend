const Joi = require('joi');

// Año del panel de inicio. Opcional: sin él, el service usa el año en curso.
// Entero acotado: el service lo interpola en SQL (EXTRACT(YEAR ...) = year).
const queryStatsSchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100),
});

module.exports = { queryStatsSchema };
