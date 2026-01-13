const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class VendorService {

  constructor() { }

  async find(query) {
    const options = {
      where: {}
    }

    const { limit, offset } = query;
    if (limit && offset) {
      options.limit = parseInt(limit, 10);
      options.offset = parseInt(offset, 10);
    }

    const vendor = await models.Vendor.findAll(options);
    return vendor;
  }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['code', 'ASC']],
      where: {},
    }

    if (searchTerm) {
      // 1. Limpiamos y preparamos el patrón de búsqueda
      const term = searchTerm.trim();
      // Si el usuario ya puso %, lo usamos tal cual; si no, le ponemos % a ambos lados
      const searchPattern = term.includes('%') ? term : `%${term}%`;

      // 2. Aplicamos el OR para todas las columnas relevantes
      options.where[Op.or] = [
        { code: { [Op.iLike]: searchPattern } },
        { nif: { [Op.iLike]: searchPattern } },
        { name: { [Op.iLike]: searchPattern } }
      ];
    }

    try {
      const { count, rows } = await models.Vendor.findAndCountAll(options);

      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en VendorService.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar proveedor paginados', error);
    }
  }

  async findOne(code, includeDocuments = false) {
    const queryOptions = {};

    if (includeDocuments) {
      queryOptions.include = [
        {
          model: models.purchInvoice,
          as: 'purchInvoice',
          attributes: ['code']
        },
        {
          model: models.purchPostInvoice,
          as: 'purchPostInvoice',
          attributes: ['code']
        },
      ];
    }

    const vendor = await models.Vendor.findByPk(code, queryOptions);
    if (!vendor) {
      throw boom.notFound('Proveedor no encontrado');
    }
    return vendor;
  }

  async search(searchTerm) {
    // 1. Limpiamos espacios en blanco al inicio y al final
    const term = searchTerm ? searchTerm.trim() : '';
    if (!term) return [];

    // Usamos el comodín % a ambos lados para búsqueda parcial
    const searchPattern = `%${term}%`;

    const options = {
      where: {
        [Op.or]: [
          { code: { [Op.iLike]: searchPattern } },
          { nif: { [Op.iLike]: searchPattern } },
          { name: { [Op.iLike]: searchPattern } }
        ]
      },
      limit: 10,
      order: [['code', 'ASC']],
      raw: true // Esto ayuda a que los resultados sean objetos planos más ligeros
    };

    if (searchTerm) {
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    try {
      const records = await models.Vendor.findAll(options);
      return records;
    } catch (error) {
      console.error("Error en el servicio de búsqueda:", error);
      return [];
    }
  }

  async create(data) {
    const newVendor = await models.Vendor.create(data)
    return newVendor;
  }


  // Por lo tanto, debe utilizar el propio método 'this.findOne()' del servicio.
  async update(code, changes) {
    console.log(`\n--- DEBUG: Dentro de VendorService.update(${code}, changes) ---`);
    const vendor = await this.findOne(code);

    const updatedVendor = await vendor.update(changes);
    return updatedVendor;
  }

  async delete(code) {
    // 1. Buscamos al cliente usando el objeto de opciones correcto
    const vendor = await models.Vendor.findOne({
      where: { code: code }, // <--- Esto es lo que faltaba
      include: [
        { model: models.purchInvoice, as: 'purchInvoice', attributes: ['code'] },
        { model: models.purchpostInvoice, as: 'purchpostInvoice', attributes: ['code'] }
      ]
    });

    if (!vendor) {
      throw new Error(`Proveedor con código ${code} no encontrado`);
    }

    // 2. Validación de integridad
    // Nota: Asegúrate de que las asociaciones en el modelo estén bien definidas
    // para que estos arrays existan (aunque estén vacíos).
    if (
      (vendor.purchInvoice && vendor.purchInvoice.length > 0) ||
      (vendor.purchpostInvoice && vendor.purchpostInvoice.length > 0)
    ) {
      throw new Error(`No se puede eliminar: el proveedor tiene documentos contables vinculados.`);
    }

    // 3. Ejecución del Borrado (Lógico si tienes paranoid: true)
    await vendor.destroy();

    return { code };
  }
}

module.exports = VendorService;
