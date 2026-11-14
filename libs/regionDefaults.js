/**
 * Valores iniciales según el país elegido en el asistente de primera
 * instalación (POST /setup/first-admin, ver routes/setup.router.js):
 *  - Veri*factu (module_config 'VERIFACTU'): obligación española. Activado
 *    por defecto solo en España; se puede cambiar después en
 *    Configuración › Módulos.
 *  - Catálogo de impuestos (tax_rates): la migración carga los de España;
 *    para otro país se sustituyen por los suyos, solo si todavía no hay
 *    ningún documento ni producto que use impuestos (instalación nueva).
 * Cada empresa ajusta después el catálogo en Configuración › Impuestos.
 */
const { models } = require('./sequelize');
const sequelize = require('./sequelize');

const COUNTRIES = ['ES', 'CO', 'OTHER'];

// [código, nombre, clase, porcentaje, por defecto]
const TAX_PRESETS = {
  ES: null, // los de la migración 20261114200000-create_tax_rates.js
  CO: [
    ['IVA', 'IVA general', 'IVA', 19, true],
    ['IVA', 'IVA reducido', 'IVA', 5, false],
    ['EXENTO', 'Exento', 'EXENTO', 0, false],
    ['INC', 'Impuesto nacional al consumo', 'IVA', 8, false],
    ['ReteFuente', 'Retención en la fuente compras', 'RETENCION', 2.5, false],
    ['ReteFuente', 'Retención en la fuente servicios', 'RETENCION', 4, false],
    ['ReteFuente', 'Retención en la fuente honorarios', 'RETENCION', 10, false]
  ],
  OTHER: [
    ['IMP', 'Impuesto general', 'IVA', 0, true],
    ['EXENTO', 'Exento', 'EXENTO', 0, false]
  ]
};

const LINE_TABLES = ['sales_budget_lines', 'sales_invoice_lines', 'sales_post_invoice_lines', 'purch_invoice_lines', 'purch_post_invoice_lines', 'products'];

/**
 * @param {{ country?: string, verifactu?: boolean }} options
 * @returns {Promise<{ country: string, verifactu: boolean, taxesReplaced: boolean }>}
 */
const applyRegionDefaults = async ({ country = 'ES', verifactu } = {}) => {
  const region = COUNTRIES.includes(country) ? country : 'ES';
  const verifactuEnabled = verifactu ?? region === 'ES';

  return sequelize.transaction(async (transaction) => {
    const [module] = await models.ModuleConfig.findOrCreate({
      where: { key: 'VERIFACTU' },
      defaults: { key: 'VERIFACTU', name: 'Veri*factu (AEAT)', description: 'Facturación electrónica verificable (España)', enabled: verifactuEnabled },
      transaction
    });
    if (module.enabled !== verifactuEnabled) await module.update({ enabled: verifactuEnabled }, { transaction });

    let taxesReplaced = false;
    const preset = TAX_PRESETS[region];
    if (preset) {
      // Una a una: varias consultas a la vez en la misma transacción no
      // están permitidas (comparten conexión)
      let used = 0;
      for (const table of LINE_TABLES) {
        used += (await sequelize.query(`SELECT count(*)::int AS n FROM ${table}`, { transaction, plain: true })).n;
      }
      if (used === 0) {
        await models.TaxRate.destroy({ where: {}, transaction });
        await models.TaxRate.bulkCreate(preset.map(([code, name, taxClass, percentage, isDefault], i) => ({
          code, name, taxClass, percentage, isDefault,
          exemptionCause: taxClass === 'EXENTO' ? 'E1' : null,
          sortOrder: (i + 1) * 10
        })), { transaction });
        taxesReplaced = true;
      }
    }
    return { country: region, verifactu: verifactuEnabled, taxesReplaced };
  });
};

module.exports = { applyRegionDefaults, COUNTRIES };
