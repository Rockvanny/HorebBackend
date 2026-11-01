const sequelize = require('../libs/sequelize');

/**
 * Tiempo actual en la ciudad de la empresa, para el bloque "Hoy" del panel
 * de inicio del escritorio. Es información de ambiente: cualquier fallo
 * (sin ciudad configurada, sin internet, servicio caído) se devuelve como
 * "no disponible", nunca como un error.
 *
 * Open-Meteo (https://open-meteo.com): gratuito, sin API key y con
 * cobertura mundial -vale igual para España que para otros países, a
 * diferencia de CartoCiudad (geocoding.service.js), que solo cubre España-.
 * Dos llamadas: geocodificar el nombre de la ciudad y pedir la previsión
 * de esas coordenadas. Al servicio solo se le envía el nombre de la ciudad.
 */
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 5000;

// El tiempo no cambia de un minuto a otro: una consulta cada 30 min por
// ciudad como mucho, aunque el panel se recargue en cada cambio de pantalla.
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map(); // "city:..." o "coords:lat,lon" -> { at, data }

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

function fromCache(key) {
  const cached = cache.get(key);
  return cached && Date.now() - cached.at < CACHE_TTL_MS ? cached.data : null;
}

class WeatherService {
  /** Tiempo en la ciudad de la ficha de empresa (fuente principal). */
  async getCompanyWeather() {
    const { Company } = sequelize.models;
    const company = await Company.findOne({ attributes: ['city'], raw: true });
    const city = (company?.city || '').trim();
    if (!city) return { available: false, reason: 'no-city' };

    const key = `city:${city.toLowerCase()}`;
    const cached = fromCache(key);
    if (cached) return cached;

    try {
      const geo = await fetchJson(`${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=es&format=json`);
      const place = geo?.results?.[0];
      if (!place) return { available: false, reason: 'city-not-found', city };

      const data = await this._forecast(place.latitude, place.longitude, place.name);
      if (data.available) cache.set(key, { at: Date.now(), data });
      return data;
    } catch (error) {
      // Sin internet / timeout: el panel muestra "no disponible"
      return { available: false, reason: 'unavailable', city };
    }
  }

  /**
   * Tiempo en unas coordenadas: respaldo cuando la empresa no tiene ciudad
   * y el equipo sí da su ubicación (servicios de ubicación de Windows, ver
   * stats.js#today). El frontend ya las redondea a 2 decimales (~1 km).
   */
  async getWeatherAt(latitude, longitude) {
    const key = `coords:${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const cached = fromCache(key);
    if (cached) return cached;

    try {
      // Open-Meteo no tiene geocodificación inversa: sin nombre de ciudad
      const data = await this._forecast(latitude, longitude, null);
      if (data.available) cache.set(key, { at: Date.now(), data });
      return data;
    } catch (error) {
      return { available: false, reason: 'unavailable' };
    }
  }

  async _forecast(latitude, longitude, cityName) {
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: 'temperature_2m,weather_code',
      daily: 'temperature_2m_max,temperature_2m_min',
      timezone: 'auto',
      forecast_days: '1'
    });
    const forecast = await fetchJson(`${FORECAST_URL}?${params}`);
    if (!forecast?.current) return { available: false, reason: 'unavailable', city: cityName };

    return {
      available: true,
      city: cityName,
      temperature: Math.round(forecast.current.temperature_2m),
      // Código WMO (0 despejado, 61 lluvia...): el frontend lo traduce a
      // icono y texto.
      weatherCode: forecast.current.weather_code,
      max: Math.round(forecast.daily?.temperature_2m_max?.[0]),
      min: Math.round(forecast.daily?.temperature_2m_min?.[0])
    };
  }
}

module.exports = WeatherService;
