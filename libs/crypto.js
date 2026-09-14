const crypto = require('crypto');
const { getConfig } = require('../config/config');

/**
 * Cifrado simétrico para credenciales guardadas en BD (ej. el apiSecret de
 * un proveedor externo de Veri*factu, ver services/verifactuConfig.service.js).
 * AES_SECRET ya existía en config/config.js pero no se usaba en ningún sitio;
 * este es el primer consumidor.
 *
 * AES-256-GCM: AES_SECRET (longitud arbitraria) se normaliza a 32 bytes con
 * SHA-256 para usarlo como clave. Formato de salida: "iv:authTag:ciphertext"
 * (los tres en hex), todo en un único string para que quepa en una columna
 * TEXT sin columnas adicionales.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Tamaño recomendado de IV para GCM

function getKey() {
  const secret = getConfig().aesSecret;
  if (!secret) {
    throw new Error('AES_SECRET no configurado: no se puede cifrar/descifrar.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plainText) {
  if (plainText === null || plainText === undefined || plainText === '') return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(payload) {
  if (!payload) return null;

  const [ivHex, authTagHex, dataHex] = payload.split(':');
  if (!ivHex || !authTagHex || !dataHex) return null;

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Enmascara un secreto para exponerlo por API (nunca se devuelve en claro).
 * Ej: "sk_live_abcdef123456" -> "••••••3456"
 */
function mask(plainText) {
  if (!plainText) return null;
  const str = String(plainText);
  const visible = str.slice(-4);
  return `${'•'.repeat(6)}${visible}`;
}

module.exports = { encrypt, decrypt, mask };
