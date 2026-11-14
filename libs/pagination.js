/**
 * Paginación común de los listados (findPaginated de los servicios). Antes
 * cada servicio repetía el mismo parseo y el mismo objeto de respuesta, y el
 * `limit` llegaba de la petición sin tope: limit=100000 cargaba la tabla
 * entera en memoria. Ahora se limita a MAX_LIMIT (el Frontend pide 50 como
 * mucho y la app móvil no pagina).
 */
const MAX_LIMIT = 500;

/** Límite y desplazamiento válidos a partir de la query (strings o números). */
function parsePagination(limit, offset, defaultLimit = 100) {
  const parsedLimit = parseInt(limit, 10);
  const parsedOffset = parseInt(offset, 10);
  return {
    limit: Math.min(parsedLimit > 0 ? parsedLimit : defaultLimit, MAX_LIMIT),
    offset: parsedOffset > 0 ? parsedOffset : 0
  };
}

/** Respuesta estándar de un listado paginado (la que esperan las listas). */
function pageResult(records, count, offset) {
  return {
    records,
    hasMore: (offset + records.length) < count,
    total: count
  };
}

module.exports = { MAX_LIMIT, parsePagination, pageResult };
