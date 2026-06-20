const boom = require('@hapi/boom');
const configService = require('../config/config.js');

class ConnectionService {
  constructor() { }

  /**
   * Obtiene la configuración actual.
   * Adaptado para cumplir con la estructura de 'find'.
   */
  async find(query = {}) {
    const config = configService.getConfig();
    return [config]; // Retornamos en array para mantener consistencia
  }

  /**
   * Búsqueda avanzada paginada (sobre el fichero local).
   */
  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    try {
      const config = configService.getConfig();
      const data = [config];

      let filteredData = data;
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        filteredData = data.filter(item =>
          item.id?.toLowerCase().includes(term) ||
          item.dbHost?.toLowerCase().includes(term) ||
          item.dbName?.toLowerCase().includes(term) ||
          item.dbUser?.toLowerCase().includes(term)
        );
      }

      const total = filteredData.length;
      const rows = filteredData.slice(parsedOffset, parsedOffset + parsedLimit);

      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < total,
        total: total,
      };
    } catch (error) {
      console.error('Error en ConnectionService.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar configuración de conexión');
    }
  }

  /**
   * Obtiene la configuración (única).
   */
  async findOne(id) { // Recibe el ID aunque lo ignores
    const config = configService.getConfig();
    if (!config) throw boom.notFound('Configuración no encontrada');

    // Inyectamos el id: 1 para que el front lo reconozca
    return { ...config, id: 1 };
}

  /**
   * Búsqueda rápida (búsqueda sobre el host/nombre).
   */
  async search(searchTerm) {
    const term = searchTerm ? searchTerm.toLowerCase().trim() : '';
    if (!term) return [];

    const config = configService.getConfig();
    const match = config.dbHost?.toLowerCase().includes(term) ||
                  config.dbName?.toLowerCase().includes(term);

    return match ? [config] : [];
  }

  /**
   * ACTUALIZAR: Delegamos al configService la escritura segura/cifrada.
   * Se mantiene el parámetro userExecutor para mantener la firma de tus servicios.
   */
  async update(id, changes, userExecutor) {
    try {
      // Nota: En este caso 'id' no es necesario al ser una config global,
      // pero mantenemos el parámetro por consistencia.
      configService.updateConfig(changes);
      return { success: true, message: "Configuración actualizada" };
    } catch (error) {
      console.error("Error en ConnectionService.update:", error);
      throw boom.badImplementation('Error al actualizar la configuración');
    }
  }

  // delete y create no aplican aquí por ser un fichero de configuración única,
  // pero la estructura de la clase ya es idéntica a tu CustomerService.
}

module.exports = ConnectionService;
