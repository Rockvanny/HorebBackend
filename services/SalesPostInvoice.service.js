const crypto = require('crypto');

/**
 * Genera la huella (Fingerprint) para Veri*factu
 * @param {Object} invoice - Datos de la factura actual
 * @param {String|null} prevHash - Hash de la factura anterior
 */
const generateVerifactuHash = (invoice, prevHash) => {
  // 1. Normalización de campos clave
  const nif = (invoice.nif || '').trim().toUpperCase();
  const code = (invoice.code || '').trim();
  const total = parseFloat(invoice.amountWithVAT || 0).toFixed(2);

  // 2. Normalización de Fecha (Asegurar YYYY-MM-DD)
  let dateStr = invoice.postingDate;
  if (dateStr instanceof Date) {
    dateStr = dateStr.toISOString().split('T')[0];
  }

  // 3. Construcción de la cadena de encadenamiento
  const dataString = [
    prevHash || "0".repeat(64),
    nif,
    code,
    dateStr,
    total
  ].join('|');

  // 4. Generación del Hash SHA-256
  return crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex')
    .toUpperCase();
};

module.exports = generateVerifactuHash;
