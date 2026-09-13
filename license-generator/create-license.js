'use strict';

/**
 * Emite una licencia firmada para un cliente concreto.
 *
 * Uso:
 *   node license-generator/create-license.js \
 *     --customer "Acme SL" \
 *     --fingerprint <huella-devuelta-por-GET-/api/v1/license/fingerprint-del-cliente> \
 *     --plan PRO \
 *     --modules GESTION,SALES,PURCHASES,SETUP \
 *     --days 365 \
 *     --out acme.lic
 *
 * La licencia es un JWT (RS256) firmado con license-generator/keys/private.pem.
 * El backend del cliente verifica la firma con la clave pública embebida y
 * comprueba que el campo `fingerprint` coincide con la máquina donde corre.
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const required = ['customer', 'fingerprint', 'plan', 'modules', 'days'];
const missing = required.filter((key) => !args[key]);
if (missing.length > 0) {
  console.error(`Faltan argumentos obligatorios: ${missing.join(', ')}`);
  console.error('Uso: node create-license.js --customer <nombre> --fingerprint <huella> --plan <plan> --modules GESTION,SALES --days <n> [--out fichero.lic]');
  process.exit(1);
}

const privateKeyPath = path.join(__dirname, 'keys', 'private.pem');
if (!fs.existsSync(privateKeyPath)) {
  console.error('No existe license-generator/keys/private.pem. Ejecuta primero: node license-generator/generate-keys.js');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const modules = args.modules.split(',').map((m) => m.trim().toUpperCase()).filter(Boolean);
const days = parseInt(args.days, 10);

if (!Number.isInteger(days) || days <= 0) {
  console.error('--days debe ser un entero positivo');
  process.exit(1);
}

const payload = {
  customer: args.customer,
  plan: args.plan.toUpperCase(),
  modules,
  fingerprint: args.fingerprint
};

const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  expiresIn: `${days}d`,
  issuer: 'noxiva-control-licensing'
});

const outFile = args.out || `${args.customer.replace(/\s+/g, '_').toLowerCase()}.lic`;
fs.writeFileSync(outFile, token);

console.log(`Licencia generada: ${outFile}`);
console.log(`Cliente: ${payload.customer} | Plan: ${payload.plan} | Módulos: ${modules.join(', ')} | Caduca en ${days} días`);
