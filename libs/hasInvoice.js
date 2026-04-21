const crypto = require('crypto');

/**
 * Genera la huella (Fingerprint) para Veri*factu
 * @param {Object} invoice - Datos de la factura actual
 * @param {String|null} prevHash - Hash de la factura anterior
 * @returns {String} - Hash SHA-256 en mayúsculas
 */
const generateVerifactuHash = (invoice, prevHash) => {
  // 1. Normalización de los datos (Punto crítico para que el hash sea válido)
  // El formato debe ser siempre el mismo para que el hash sea reproducible
  const nif = invoice.nif.trim().toUpperCase();
  const code = invoice.code.trim();
  const total = parseFloat(invoice.amountWithVAT).toFixed(2); // Siempre 2 decimales string

  // La AEAT requiere fechas en formato ISO o DD-MM-YYYY.
  // Usaremos una cadena simple concatenada por pipes (|)
  const dataString = [
    prevHash || "0000000000000000000000000000000000000000000000000000000000000000", // Hash génesis si es la primera
    nif,
    code,
    invoice.postingDate, // Formato YYYY-MM-DD
    total
  ].join('|');

  // 2. Cálculo del Hash SHA-256
  return crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex')
    .toUpperCase();
};

module.exports = generateVerifactuHash;
