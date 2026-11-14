/**
 * Ajustes de la instalación (tabla installation_settings): país, moneda y
 * formato regional. Se fijan en el asistente de primera instalación
 * (routes/setup.router.js) y no cambian después; el Frontend los recibe con
 * los permisos (permissions.service.js#settings) para mostrar los campos de
 * cada país y dar formato a los importes.
 */
const { models } = require('./sequelize');

const COUNTRY_DEFAULTS = {
  ES: { currency: 'EUR', locale: 'es-ES' },
  CO: { currency: 'COP', locale: 'es-CO' },
  OTHER: { currency: 'USD', locale: 'es' }
};

const CURRENCIES = ['EUR', 'COP', 'USD', 'MXN', 'PEN', 'CLP', 'ARS'];

const DEFAULT_SETTINGS = { country: 'ES', ...COUNTRY_DEFAULTS.ES };

/** Ajustes actuales (España / EUR si la fila aún no existe) */
const getInstallationSettings = async () => {
  const row = await models.InstallationSettings.findByPk(1);
  if (!row) return { ...DEFAULT_SETTINGS };
  return { country: row.country, currency: row.currency, locale: row.locale };
};

/**
 * Fija país y moneda (solo desde la primera instalación). La moneda, si no
 * se elige, la del país.
 */
const saveInstallationSettings = async ({ country, currency }, transaction) => {
  const defaults = COUNTRY_DEFAULTS[country] || COUNTRY_DEFAULTS.ES;
  const values = {
    id: 1,
    country: COUNTRY_DEFAULTS[country] ? country : 'ES',
    currency: CURRENCIES.includes(currency) ? currency : defaults.currency,
    locale: defaults.locale
  };
  await models.InstallationSettings.upsert(values, { transaction });
  return { country: values.country, currency: values.currency, locale: values.locale };
};

module.exports = { getInstallationSettings, saveInstallationSettings, COUNTRY_DEFAULTS, CURRENCIES };
