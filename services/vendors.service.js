const { Op, fn, col } = require('sequelize');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const logger = require('../libs/logger');

// Mismo criterio que CustomerService: F1/F2 suman al saldo, las
// rectificativas (R1-R5) restan.
const INVOICED_TYPES = ['F1', 'F2'];
const RECTIFICATION_TYPES = ['R1', 'R2', 'R3', 'R4', 'R5'];

// SQLSTATE de Postgres para "la tabla no existe" — mientras purch_post_invoices
// no esté activa (migración en .bak durante el desarrollo por módulos),
// degradamos a saldo 0 en vez de romper el listado/detalle de proveedores.
const UNDEFINED_TABLE = '42P01';

class VendorService {
  constructor() { }

  /**
   * Saldo facturado (F1/F2 netas de rectificativas) y saldo pendiente (mismo
   * cálculo, restringido a facturas en estado 'Abierto') para un conjunto de
   * proveedores. Se recalcula contra `purch_post_invoices` en cada consulta.
   */
  async #computeBalances(vendorCodes) {
    const balances = {};
    vendorCodes.forEach(code => {
      balances[code] = { saldoFacturado: 0, saldoPendiente: 0 };
    });

    if (!vendorCodes.length) return balances;

    let rows;
    try {
      rows = await models.purchPostInvoice.findAll({
        attributes: [
          'entityCode',
          'typeInvoice',
          'status',
          [fn('SUM', col('amount_with_vat')), 'total']
        ],
        where: { entityCode: { [Op.in]: vendorCodes } },
        group: ['entityCode', 'typeInvoice', 'status'],
        raw: true
      });
    } catch (error) {
      if (error.original?.code === UNDEFINED_TABLE || error.parent?.code === UNDEFINED_TABLE) {
        logger.error('VendorService#computeBalances: purch_post_invoices no existe todavía, devolviendo saldos en 0.');
        return balances;
      }
      throw error;
    }

    rows.forEach(row => {
      const isInvoiced = INVOICED_TYPES.includes(row.typeInvoice);
      const isRectification = RECTIFICATION_TYPES.includes(row.typeInvoice);
      if (!isInvoiced && !isRectification) return;

      const total = parseFloat(row.total) || 0;
      const signedTotal = isRectification ? -total : total;

      balances[row.entityCode].saldoFacturado += signedTotal;
      if (row.status === 'Abierto') {
        balances[row.entityCode].saldoPendiente += signedTotal;
      }
    });

    return balances;
  }

  /**
   * Saldo facturado/pendiente de un único proveedor (usado por el endpoint
   * de detalle).
   */
  async getBalances(code) {
    const balances = await this.#computeBalances([code]);
    return balances[code];
  }

  /**
   * Convierte instancias Vendor en objetos planos con
   * `saldoFacturado`/`saldoPendiente` añadidos (una sola query agregada).
   */
  async #attachBalances(vendors) {
    if (!vendors.length) return [];

    const codes = vendors.map(v => v.code);
    const balances = await this.#computeBalances(codes);

    return vendors.map(v => ({
      ...v.toJSON(),
      ...balances[v.code]
    }));
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
        records: await this.#attachBalances(rows),
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
