const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class ProductsService {

  constructor() { }

  async find(query) {
    const options = { where: {} };
    const { limit, offset } = query;
    if (limit && offset) {
      options.limit = parseInt(limit, 10);
      options.offset = parseInt(offset, 10);
    }
    return await models.Products.findAll(options);
  }

  async findPaginated({ limit, offset, searchTerm }) {
    // Corregido el radix de limit (tenías 15, debe ser 10)
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['code', 'ASC']],
      where: {},
    };

    if (searchTerm) {
      // Ajustado: Tú usas 'name', no 'description' según el modelo que validamos
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { name: { [Op.iLike]: `%${searchTerm}%` } }
      ];
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
    const product = await models.Products.findByPk(code);
    if (!product) {
      throw boom.notFound('Producto no encontrado');
    }
    return product;
  }

  async search(searchTerm) {
    const options = {
      where: {},
      limit: 10,
      order: [['code', 'ASC']]
    };

    if (searchTerm) {
      options.where[Op.or] = [
        { code: { [Op.iLike]: `%${searchTerm}%` } },
        { name: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    return await models.Products.findAll(options);
  }

  async create(data, userExecutor) {
    const t = await models.Products.sequelize.transaction();

    try {
      // IMPORTANTE: El hook 'beforeValidate' busca 'user' en options
      const newProduct = await models.Products.create(data, {
        transaction: t,
        user: userExecutor // Sincronizado con el Hook del modelo
      });

      await t.commit();
      return newProduct;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async update(code, changes, userExecutor) {
    const product = await this.findOne(code);

    // Pasamos el usuario en las opciones para que el Hook de actualización funcione
    const updatedProduct = await product.update(changes, {
      user: userExecutor
    });
    return updatedProduct;
  }

  async delete(code) {
    // Usamos findOne para asegurar que existe antes de borrar
    await this.findOne(code);

    await models.Products.destroy({
      where: { code }
    });

    return { code };
  }
}

module.exports = ProductsService;
