const jwt = require('jsonwebtoken');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const { getConfig } = require('../config/config');
const { getMachineFingerprint } = require('../libs/fingerprint');

const config = getConfig();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function getOrCreateState() {
  const [state] = await models.LicenseState.findOrCreate({
    where: { id: 1 },
    defaults: { trialStartedAt: new Date() }
  });
  return state;
}

/**
 * Decodifica y valida un token de licencia (firma RS256 + caducidad + huella
 * de esta máquina). No toca la base de datos.
 */
function verifyLicenseToken(token) {
  if (!config.licensePublicKey) {
    throw boom.badImplementation('No hay clave pública de licencias configurada en este backend.');
  }

  let claims;
  try {
    claims = jwt.verify(token, config.licensePublicKey, {
      algorithms: ['RS256'],
      issuer: 'noxiva-control-licensing'
    });
  } catch (error) {
    throw boom.unauthorized('Licencia inválida o caducada');
  }

  const currentFingerprint = getMachineFingerprint();
  if (claims.fingerprint !== currentFingerprint) {
    throw boom.forbidden('Esta licencia no corresponde a este equipo');
  }

  return claims;
}

class LicenseService {

  /**
   * Se llama una vez al arrancar. Si es la primera vez que corre esta
   * instalación (no existe fila de estado), fija el inicio del periodo de
   * prueba en este momento.
   */
  async ensureTrialInitialized() {
    await getOrCreateState();
  }

  getFingerprint() {
    return getMachineFingerprint();
  }

  /**
   * Estado comercial de esta instalación: licencia activa válida, en
   * prueba (con días restantes), o expirada sin licencia.
   */
  async getStatus() {
    const state = await getOrCreateState();

    if (state.licenseToken) {
      try {
        const claims = verifyLicenseToken(state.licenseToken);
        return {
          status: 'LICENSED',
          customer: claims.customer,
          plan: claims.plan,
          modules: claims.modules,
          expiresAt: new Date(claims.exp * 1000)
        };
      } catch (error) {
        // La licencia guardada ya no es válida (caducó, o cambió la máquina).
        // Caemos al estado de prueba/expirado en vez de romper el arranque.
        return this.#trialStatus(state);
      }
    }

    return this.#trialStatus(state);
  }

  /**
   * Verifica y guarda una licencia nueva para esta instalación.
   */
  async activateLicense(token) {
    const claims = verifyLicenseToken(token);

    const state = await getOrCreateState();
    await state.update({ licenseToken: token });

    return {
      customer: claims.customer,
      plan: claims.plan,
      modules: claims.modules,
      expiresAt: new Date(claims.exp * 1000)
    };
  }

  #trialStatus(state) {
    const elapsedMs = Date.now() - new Date(state.trialStartedAt).getTime();
    const elapsedDays = Math.floor(elapsedMs / MS_PER_DAY);
    const daysRemaining = config.trialDurationDays - elapsedDays;

    if (daysRemaining <= 0) {
      return { status: 'TRIAL_EXPIRED', daysRemaining: 0 };
    }

    return { status: 'TRIAL', daysRemaining };
  }
}

module.exports = LicenseService;
