'use strict';

/**
 * Genera el par de claves RSA para firmar/verificar licencias.
 *
 * Uso: node license-generator/generate-keys.js
 *
 * La clave PRIVADA (keys/private.pem) es la que firma licencias: no debe
 * salir nunca de tu máquina, no se sube a git, no se empaqueta con el backend.
 * La clave PÚBLICA (keys/public.pem) es la que va embebida en el backend
 * (config/license-public-key.pem) para poder VERIFICAR licencias, nunca firmarlas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const keysDir = path.join(__dirname, 'keys');
const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

if (fs.existsSync(privateKeyPath)) {
  console.error(`Ya existe ${privateKeyPath}. Bórralo a mano si de verdad quieres generar un par nuevo`);
  console.error('(esto invalidaría todas las licencias ya emitidas con la clave actual).');
  process.exit(1);
}

fs.mkdirSync(keysDir, { recursive: true });

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
fs.writeFileSync(publicKeyPath, publicKey);

console.log('Par de claves generado en license-generator/keys/');
console.log('Copia manualmente el contenido de keys/public.pem a config/license-public-key.pem del backend.');
console.log('NO subas keys/private.pem a ningún sitio compartido.');
