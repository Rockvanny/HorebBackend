const crypto = require('crypto');

/**
 * Huella (hash) de un registro Veri*factu, siguiendo al pie de la letra la
 * especificación oficial de la AEAT ("Detalle de las especificaciones
 * técnicas para generación de la huella o hash de los registros de
 * facturación", v0.1.2, 27/08/2024, https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf):
 *
 * Se concatenan EXACTAMENTE estos 8 campos, en este orden, como
 * "nombreCampo=valorCampo" unidos por "&" (sin URL-encodear los valores -no
 * es una query string-, sin espacios al inicio/fin, campo vacío si no hay
 * valor -p.ej. Huella= en el primer registro de la cadena-), se codifica en
 * UTF-8 y se aplica SHA-256; la salida va en hexadecimal, en MAYÚSCULAS.
 *
 * Verificado byte a byte contra los 3 ejemplos oficiales del documento (ver
 * generateVerifactuHash.selftest.js si se necesita volver a comprobar).
 *
 * @param {object} fields
 * @param {string} fields.idEmisorFactura - NIF del emisor
 * @param {string} fields.numSerieFactura - Serie+número de la factura
 * @param {string} fields.fechaExpedicionFactura - DD-MM-YYYY
 * @param {string} fields.tipoFactura - p.ej. "F1"
 * @param {string} fields.cuotaTotal - importe con "." decimal, p.ej. "12.35"
 * @param {string} fields.importeTotal - importe con "." decimal, p.ej. "123.45"
 * @param {string} fields.huellaAnterior - huella del registro anterior, o '' si es el primero de la cadena
 * @param {string} fields.fechaHoraHusoGenRegistro - ISO 8601 con offset, p.ej. "2024-01-01T19:20:30+01:00"
 * @returns {string} huella en hexadecimal mayúsculas (64 caracteres)
 */
function generateVerifactuHash(fields) {
  const trim = (v) => (v === undefined || v === null ? '' : String(v).trim());

  const dataString = [
    `IDEmisorFactura=${trim(fields.idEmisorFactura)}`,
    `NumSerieFactura=${trim(fields.numSerieFactura)}`,
    `FechaExpedicionFactura=${trim(fields.fechaExpedicionFactura)}`,
    `TipoFactura=${trim(fields.tipoFactura)}`,
    `CuotaTotal=${trim(fields.cuotaTotal)}`,
    `ImporteTotal=${trim(fields.importeTotal)}`,
    `Huella=${trim(fields.huellaAnterior)}`,
    `FechaHoraHusoGenRegistro=${trim(fields.fechaHoraHusoGenRegistro)}`,
  ].join('&');

  return crypto.createHash('sha256').update(dataString, 'utf8').digest('hex').toUpperCase();
}

module.exports = generateVerifactuHash;
