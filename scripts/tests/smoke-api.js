/**
 * Prueba rápida de la API contra el servidor local (Docker) después de un
 * cambio. No escribe nada: solo lee los listados que usa la aplicación y
 * comprueba que responden con la forma que esperan las listas.
 *
 * Uso (desde Backend/, con el servidor levantado):
 *   node scripts/tests/smoke-api.js <codigo-usuario-admin> [url]
 *   url por defecto: http://localhost:3000/api/v1
 *
 * Firma un token de sesión de escritorio para ese usuario con JWT_SECRET
 * del .env (el usuario debe existir y ser administrador). No va en la
 * imagen de producción (.dockerignore excluye scripts/).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const jwt = require('jsonwebtoken');

const [userCode, baseUrl = 'http://localhost:3000/api/v1'] = process.argv.slice(2);
if (!userCode) {
  console.error('Uso: node scripts/tests/smoke-api.js <codigo-usuario-admin> [url]');
  process.exit(2);
}
const token = jwt.sign({ sub: userCode, role: 'admin', type: 'USER' }, process.env.JWT_SECRET, { expiresIn: '5m' });

// Listados de la aplicación (listPage de Frontend document-schema.mjs)
const LISTS = [
  ['/conexion/conexion-paginated'],
  ['/company/company-paginated'],
  ['/moduleConfig/module-config-paginated'],
  ['/verifactuConfig/verifactu-config-paginated'],
  ['/users/users-paginated'],
  ['/employees/employees-paginated'],
  ['/customers/customers-paginated'],
  ['/vendors/vendors-paginated'],
  ['/products/products-paginated'],
  ['/buildings/buildings-paginated'],
  ['/seriesNumber/series-paginated'],
  ['/operatingExpenses/operatingExpenses-paginated'],
  ['/salesBudgets/salesBudgets-paginated'],
  ['/salesInvoices/salesInvoices-paginated', 'invoicesOnly'],
  ['/salesInvoices/salesInvoices-paginated', 'overdue'],
  ['/salesInvoices/salesInvoices-paginated', 'creditNotes'],
  ['/salesPostInvoices/salesPostInvoices-paginated', 'invoicesOnly'],
  ['/salesPostInvoices/salesPostInvoices-paginated', 'creditNotes'],
  ['/purchInvoices/purchInvoices-paginated', 'invoicesOnly'],
  ['/purchInvoices/purchInvoices-paginated', 'overdue'],
  ['/purchInvoices/purchInvoices-paginated', 'creditNotes'],
  ['/purchPostInvoices/purchPostInvoices-paginated', 'invoicesOnly'],
  ['/purchPostInvoices/purchPostInvoices-paginated', 'creditNotes'],
  ['/verifactuLogs/logs-paginated']
];

async function get(url) {
  const started = Date.now();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => null);
  return { status: res.status, body, ms: Date.now() - started };
}

(async () => {
  let failures = 0;
  for (const [route, filter] of LISTS) {
    const label = `${route}${filter ? ` (${filter})` : ''}`;
    try {
      const qs = `limit=5&offset=0${filter ? `&${filter}=true` : ''}&searchTerm=a`;
      const { status, body, ms } = await get(`${baseUrl}${route}?${qs}`);
      const data = body?.data ?? body; // algunos routers envuelven en { success, data }
      const ok = status === 200 && Array.isArray(data?.records) && typeof data?.hasMore === 'boolean';
      if (!ok) failures++;
      console.log(`${ok ? 'OK   ' : 'FALLO'} ${label.padEnd(64)} ${status} ${ms}ms${ok ? '' : ' ' + JSON.stringify(body).slice(0, 150)}`);
    } catch (error) {
      failures++;
      console.log(`FALLO ${label.padEnd(64)} ${error.message}`);
    }
  }
  console.log(failures ? `\n${failures} listado(s) con fallos` : `\nLos ${LISTS.length} listados responden bien`);
  process.exit(failures ? 1 : 0);
})();
