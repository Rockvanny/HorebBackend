/**
 * Formatos de fecha exigidos por los esquemas/especificación Veri*factu de
 * la AEAT (ver resources/verifactu-xsd/SuministroInformacion.xsd, tipos
 * `fecha` y campos *HusoGenRegistro, y el PDF de especificación de la
 * huella): DD-MM-YYYY para fechas sueltas, ISO 8601 con offset numérico
 * (nunca "Z") para fecha+hora+huso horario.
 *
 * Usa los getters LOCALES de Date a propósito -no los UTC-: index.js fija
 * `process.env.TZ = 'Europe/Madrid'` globalmente al arrancar, así que
 * reflejan la hora peninsular real (con su cambio de horario CET/CEST)
 * igual que exige la normativa.
 */

const pad = (n, len = 2) => String(n).padStart(len, '0');

/** DD-MM-YYYY. Acepta Date, o un string 'YYYY-MM-DD' (DATEONLY de Sequelize). */
function toFechaAEAT(value) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

/** YYYY-MM-DDTHH:mm:ss+HH:MM (offset numérico de Europe/Madrid, nunca "Z"). */
function toFechaHoraHusoAEAT(date = new Date()) {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const offH = pad(Math.floor(Math.abs(offsetMin) / 60));
  const offM = pad(Math.abs(offsetMin) % 60);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    + `${sign}${offH}:${offM}`;
}

module.exports = { toFechaAEAT, toFechaHoraHusoAEAT };
