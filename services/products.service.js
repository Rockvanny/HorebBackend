const { Op } = require('sequelize');
const boom = require('@hapi/boom');

// Se importa el objeto 'models' que contiene todos tus modelos Sequelize.
const { models } = require('../libs/sequelize');

class ProductsService {

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

    const product = await models.Products.findAll(options);
    return product;
  }


  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 15) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['code', 'ASC']],
      where: {},
    }

    if (searchTerm) {
      if (searchTerm) {
        // Buscamos coincidencia parcial en código O descripción
        options.where[Op.or] = [
          { code: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } }
        ];
      } else {
        options.where.code = {
          [Op.iLike]: `%${searchTerm}`
        }
      }
    }

    try {
      const { count, rows } = await models.Products.findAndCountAll(options);

      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      console.error('Error en Product.findPaginated: ', error);
      throw boom.badImplementation('Error al consultar productos paginados', error);
    }
  }

  async findOne(code) {
    const product = await models.Products.findByPk(code, {});
    console.log('consulta por findOne');
    if (!product) {
      throw boom.notFound('product not found');
    }

    return product;
  }

  async search(searchTerm) {
    const options = {
      where: {},
      limit: 10, // Limita los resultados para autocompletado, por ejemplo
      order: [['code', 'ASC']]
    };

    if (searchTerm) {
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    const records = await models.Products.findAll(options);
    return records;
  }

  async create(data) {
    const newProduct = await models.Products.create(data);
    return newProduct;
  }

  // Este método necesita obtener un producto existente para actualizarlo.
  // Por lo tanto, debe utilizar el propio método 'this.findOne()' del servicio.
  async update(code, changes) {
    console.log(`\n--- DEBUG: Dentro de Products.update(${code}, changes) ---`);
    const product = await this.findOne(code);

    const updatedProduct = await product.update(changes);
    return updatedProduct;
  }

  async delete(code) {
    const productToDelete = await this.findOne(code);
    if (!productToDelete) {
      throw new Error(`Products with code ${code} not found`); // Lanza un error si no existe
    }

    await models.Products.destroy({
      where: {
        code: code
      }
    });

    return { code };
  }
}

module.exports = ProductsService;
