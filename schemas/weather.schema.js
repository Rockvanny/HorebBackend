const Joi = require('joi');

// Coordenadas opcionales (respaldo con la ubicación del equipo). Si llega
// una, debe llegar la otra.
const queryWeatherSchema = Joi.object({
  lat: Joi.number().min(-90).max(90),
  lon: Joi.number().min(-180).max(180),
}).and('lat', 'lon');

module.exports = { queryWeatherSchema };
