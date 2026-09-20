const boom = require('@hapi/boom');
const LicenseService = require('../services/license.service');

const licenseService = new LicenseService();

// Rutas que deben funcionar SIEMPRE, aunque el trial haya caducado y no haya
// licencia activa: si no, nadie podría ni loguearse para activar una licencia,
// ni crear el primer administrador en una instalación nueva.
const EXEMPT_PREFIXES = [
  '/api/v1/setup',
  '/api/v1/license',
  '/api/v1/users/login',
  '/api/v1/users/forgot-password',
  // App móvil (Employees, flujo separado de Users desde 2026-09-20): mismo
  // criterio que el login de escritorio de arriba.
  '/api/v1/employees/login',
  '/api/v1/employees/forgot-password',
  // Autoservicio de clientes: que la licencia de la empresa haya caducado no
  // es culpa del cliente ni algo que él pueda arreglar -igual razón que el
  // login de empleados de arriba-. El resto de /customers (gestión interna,
  // incidencias ya creadas, etc.) sigue bloqueado como cualquier otra ruta.
  '/api/v1/customers/register',
  '/api/v1/customers/login',
  '/api/v1/customers/forgot-password',
];

function isExempt(originalUrl) {
  return EXEMPT_PREFIXES.some((prefix) => originalUrl.startsWith(prefix));
}

async function licenseGate(req, res, next) {
  if (isExempt(req.originalUrl)) {
    return next();
  }

  try {
    const status = await licenseService.getStatus();

    if (status.status === 'LICENSED' || status.status === 'TRIAL') {
      req.licenseStatus = status;
      return next();
    }

    return next(boom.paymentRequired(
      'El periodo de prueba ha terminado. Activa una licencia para seguir usando la aplicación.'
    ));
  } catch (error) {
    return next(error);
  }
}

module.exports = licenseGate;
