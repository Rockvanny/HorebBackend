const { Op, UniqueConstraintError } = require('sequelize');
const boom = require('@hapi/boom');
const { parsePagination, pageResult } = require('../libs/pagination');
const sequelize = require('../libs/sequelize');

const { models } = sequelize;

const ORDER = [['sort_order', 'ASC'], ['code', 'ASC'], ['percentage', 'DESC']];

// Tablas que guardan copia de código + porcentaje (impuesto o retención)
const LINE_TABLES = ['sales_budget_lines', 'sales_invoice_lines', 'sales_post_invoice_lines', 'purch_invoice_lines', 'purch_post_invoice_lines', 'products'];

const CLASS_LABELS = {
  IVA: 'impuesto que se suma',
  EXENTO: 'exento',
  RECARGO: 'recargo de equivalencia',
  RETENCION: 'retención'
};

/**
 * Catálogo de impuestos (Configuración › Impuestos, ver
 * db/models/taxRate.model.js). Las líneas guardan copia del código y el
 * porcentaje, así que editar o desactivar un tipo no cambia documentos.
 */
class TaxRatesService {
  /** Tipos activos para los desplegables de líneas y productos */
  async options() {
    const rows = await models.TaxRate.findAll({
      where: { active: true },
      order: ORDER,
      attributes: ['id', 'code', 'name', 'taxClass', 'percentage', 'exemptionCause', 'isDefault']
    });
    return rows.map(r => ({ ...r.get({ plain: true }), percentage: Number(r.percentage) }));
  }

  async findPaginated({ limit, offset, searchTerm }) {
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(limit, offset);
    const where = {};
    if (searchTerm?.trim()) {
      const pattern = `%${searchTerm.trim()}%`;
      where[Op.or] = [{ code: { [Op.iLike]: pattern } }, { name: { [Op.iLike]: pattern } }];
    }
    const { count, rows } = await models.TaxRate.findAndCountAll({
      where, order: ORDER, limit: parsedLimit, offset: parsedOffset
    });
    return pageResult(rows, count, parsedOffset);
  }

  async findOne(id) {
    const rate = await models.TaxRate.findByPk(id);
    if (!rate) throw boom.notFound('Tipo de impuesto no encontrado');
    return rate;
  }

  async create(data) {
    return this.#save(null, data);
  }

  async update(id, changes) {
    return this.#save(await this.findOne(id), changes);
  }

  /**
   * Un tipo sin usar se elimina. Si alguna línea, producto o desglose lo
   * usa, se desactiva (mismo criterio que las categorías de gasto).
   */
  async delete(id) {
    const rate = await this.findOne(id);
    const uses = await this.#usageCount(rate.code, rate.percentage);

    if (uses > 0) {
      await rate.update({ active: false, isDefault: false });
      return {
        id: rate.id,
        deactivated: true,
        message: `«${rate.name}» está en uso en ${uses} registro${uses === 1 ? '' : 's'}: se ha desactivado en lugar `
          + 'de eliminarlo. Ya no se ofrecerá en líneas ni productos, pero los documentos que lo tienen no cambian. '
          + 'Puedes reactivarlo desde su ficha.'
      };
    }

    await rate.destroy();
    return { id: rate.id, deleted: true, message: `«${rate.name}» eliminado.` };
  }

  async #save(rate, input) {
    const data = { ...input };
    const merged = { ...(rate ? rate.get({ plain: true }) : {}), ...data };

    // Exento: siempre 0 % y con causa; el resto, sin causa
    if (merged.taxClass === 'EXENTO') {
      data.percentage = 0;
      data.exemptionCause = merged.exemptionCause || 'E1';
    } else {
      data.exemptionCause = null;
    }
    if (merged.taxClass === 'RETENCION' && merged.isDefault) {
      throw boom.badRequest('Una retención no puede ser el tipo por defecto: se elige aparte en cada línea.');
    }

    // Un código, una clase: el cálculo y Veri*factu dependen de ella
    const sameCode = await models.TaxRate.findOne({
      where: { code: merged.code, taxClass: { [Op.ne]: merged.taxClass }, ...(rate ? { id: { [Op.ne]: rate.id } } : {}) }
    });
    if (sameCode) {
      throw boom.conflict(`El código «${merged.code}» ya se usa como ${CLASS_LABELS[sameCode.taxClass]} `
        + `(«${sameCode.name}»). Usa otro código o la misma clase.`);
    }

    try {
      return await sequelize.transaction(async (transaction) => {
        if (merged.isDefault) {
          await models.TaxRate.update({ isDefault: false },
            { where: { isDefault: true, ...(rate ? { id: { [Op.ne]: rate.id } } : {}) }, transaction });
        }
        return rate ? rate.update(data, { transaction }) : models.TaxRate.create(data, { transaction });
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw boom.conflict(`Ya existe un tipo «${merged.code}» al ${Number(merged.percentage)} %.`);
      }
      throw error;
    }
  }

  async #usageCount(code, percentage) {
    const replacements = { code, percentage: Number(percentage) };
    const parts = LINE_TABLES.map(t => `SELECT count(*) AS n FROM ${t}
      WHERE (tax_type = :code AND round(vat::numeric, 2) = :percentage)
         OR (withholding_type = :code AND withholding_percentage = :percentage)`);
    parts.push(`SELECT count(*) AS n FROM document_taxes WHERE tax_type = :code AND tax_percentage = :percentage`);
    const [[{ total }]] = await sequelize.query(`SELECT sum(n)::int AS total FROM (${parts.join(' UNION ALL ')}) u;`, { replacements });
    return total || 0;
  }
}

module.exports = TaxRatesService;
