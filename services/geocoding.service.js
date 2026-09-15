const boom = require('@hapi/boom');

/**
 * Sugerencia de ciudad/provincia a partir de un código postal, usando
 * CartoCiudad (geocodificador oficial del Instituto Geográfico Nacional,
 * gratuito y sin API key: https://www.cartociudad.es). Es solo una AYUDA
 * para autocompletar formularios -nunca bloquea ni valida nada-, así que
 * cualquier fallo de este servicio se trata como "sin sugerencia
 * disponible", no como un error que rompa el formulario.
 *
 * Pedir directamente el código postal no devuelve ciudad/provincia (esos
 * campos vienen null) -verificado a mano contra el servicio real-, así que
 * hacen falta dos llamadas encadenadas:
 *   1. /find?type=Codpost -> coordenadas del código postal.
 *   2. /reverseGeocode -> municipio/provincia/comunidad autónoma de esas
 *      coordenadas.
 */
const CARTOCIUDAD_BASE = 'https://www.cartociudad.es/geocoder/api/geocoder';

// Nunca cambia qué provincia/municipio corresponde a un código postal, así
// que cachear en memoria durante la vida del proceso es seguro y evita
// pedir de más a un servicio público sin límites de uso documentados. Como
// mucho hay ~11.000 códigos postales en España: la caché no puede crecer
// de forma problemática.
const cache = new Map();

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

class GeocodingService {
  async lookupPostalCode(rawCp) {
    const cp = String(rawCp || '').trim();
    if (!/^\d{5}$/.test(cp)) {
      throw boom.badRequest('El código postal debe tener 5 dígitos.');
    }

    if (cache.has(cp)) return cache.get(cp);

    const result = await this.#resolve(cp);
    // Cachea también los "no encontrado" (null): evita repetir la misma
    // llamada fallida cada vez que alguien escribe un CP que no existe.
    cache.set(cp, result);
    return result;
  }

  async #resolve(cp) {
    try {
      const candidates = await fetchJson(`${CARTOCIUDAD_BASE}/candidates?q=${cp}`);
      const candidateId = candidates?.[0]?.id;
      if (!candidateId) return null;

      const found = await fetchJson(
        `${CARTOCIUDAD_BASE}/find?q=${cp}&id=${encodeURIComponent(candidateId)}&type=Codpost`
      );
      if (!found?.lat || !found?.lng) return null;

      const place = await fetchJson(
        `${CARTOCIUDAD_BASE}/reverseGeocode?lat=${found.lat}&lon=${found.lng}`
      );
      if (!place?.muni) return null;

      return {
        postalCode: cp,
        municipio: place.muni,
        provincia: place.province || null,
        comunidadAutonoma: place.comunidadAutonoma || null,
      };
    } catch (error) {
      // Servicio externo caído/inaccesible: se trata como "sin sugerencia",
      // el formulario sigue funcionando con relleno manual.
      console.error(`[Geocoding] Error consultando CartoCiudad para CP ${cp}:`, error.message);
      return null;
    }
  }
}

module.exports = GeocodingService;
