const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');

class VendorService {
  constructor() { }

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
      const term = searchTerm.trim();
      const searchPattern = term.includes('%') ? term : `%${term}%`;
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
      throw boom.badImplementation('Error al consultar proveedores paginados');
    }
  }

  async findOne(code, includeDocuments = false) {
    const queryOptions = {};
    if (includeDocuments) {
      queryOptions.include = [
        { model: models.purchInvoice, as: 'purchInvoice', attributes: ['code'] },
        { model: models.purchPostInvoice, as: 'purchPostInvoice', attributes: ['code'] },
      ];
    }

    const vendor = await models.Vendor.findByPk(code, queryOptions);
    if (!vendor) throw boom.notFound('Proveedor no encontrado');
    return vendor;
  }

  async search(searchTerm) {
    const term = searchTerm ? searchTerm.trim() : '';
    if (!term) return [];

    const options = {
      where: {
        [Op.or]: [
          { code: { [Op.iLike]: `%${term}%` } },
          { nif: { [Op.iLike]: `%${term}%` } },
          { name: { [Op.iLike]: `%${term}%` } }
        ]
      },
      limit: 10,
      order: [['code', 'ASC']],
      raw: true
    };

    return await models.Vendor.findAll(options);
  }

  async create(data, userExecutor) {
    const t = await models.Vendor.sequelize.transaction();
    try {
      const newVendor = await models.Vendor.create(data, {
        transaction: t,
        userExecutor
      });
      await t.commit();
      return newVendor;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async update(code, changes, userExecutor) {
    const vendor = await this.findOne(code);
    return await vendor.update(changes, { userExecutor });
  }

  async delete(code, userExecutor) {
    const vendor = await this.findOne(code, true);

    const haspurchInvoice = vendor.purchInvoice?.length > 0;
    const hasPurchPostInvoice = vendor.purchPostInvoice?.length > 0;

    if ( haspurchInvoice || hasPurchPostInvoice ) {
      throw boom.conflict('No se puede eliminar: el proveedor tiene facturas vinculadas.');
    }

    await vendor.destroy({ userExecutor });
    return { code };
  }
}

module.exports = VendorService;
