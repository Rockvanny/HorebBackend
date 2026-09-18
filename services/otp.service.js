const crypto = require('crypto');
const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const { getConfig } = require('../config/config');
const { sendEmail } = require('../libs/mailer');
const logger = require('../libs/logger');
const { maskEmail } = require('../libs/maskEmail');

const config = getConfig();

function generateCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function safeCompare(hashA, hashB) {
  const bufA = Buffer.from(hashA, 'hex');
  const bufB = Buffer.from(hashB, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function assertUsable(challenge, purpose) {
  if (!challenge || challenge.consumedAt || challenge.purpose !== purpose) {
    throw boom.unauthorized('Código inválido o expirado');
  }
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw boom.unauthorized('El código ha expirado, solicita uno nuevo.');
  }
}

class OtpService {

  /**
   * Crea un reto OTP para un usuario ya autenticado por otro medio (ej. password)
   * y le envía el código por email. Devuelve solo datos no sensibles.
   */
  async createChallenge(user, purpose) {
    // Invalidamos cualquier reto anterior sin consumir del mismo usuario/propósito,
    // para que no queden códigos antiguos aún válidos en paralelo.
    await models.LoginOtp.destroy({ where: { userCode: user.code, purpose, consumedAt: null } });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + config.otpExpirationMinutes * 60 * 1000);

    const challenge = await models.LoginOtp.create({
      userCode: user.code,
      purpose,
      codeHash: hashCode(code),
      maxAttempts: config.otpMaxAttempts,
      maxResends: config.otpMaxResends,
      expiresAt
    });

    await this.#dispatchEmail(user, code, purpose);

    return {
      challengeId: challenge.id,
      expiresInSeconds: config.otpExpirationMinutes * 60,
      maskedEmail: maskEmail(user.email)
    };
  }

  /**
   * Verifica un código contra un reto pendiente. Si es correcto, consume el
   * reto (no se puede reutilizar) y devuelve el código del usuario asociado.
   */
  async verifyChallenge(challengeId, code, purpose) {
    const challenge = await models.LoginOtp.findByPk(challengeId);
    assertUsable(challenge, purpose);

    const matches = safeCompare(hashCode(code), challenge.codeHash);

    if (!matches) {
      const attempts = challenge.attempts + 1;

      if (attempts >= challenge.maxAttempts) {
        await challenge.destroy();
        throw boom.unauthorized('Código incorrecto. Has agotado los intentos, vuelve a iniciar sesión.');
      }

      await challenge.update({ attempts });
      throw boom.unauthorized('Código incorrecto');
    }

    await challenge.update({ consumedAt: new Date() });
    return challenge.userCode;
  }

  /**
   * Genera y envía un nuevo código para un reto existente (sin reiniciar el
   * flujo de login), respetando cooldown y límite de reenvíos.
   */
  async resendChallenge(challengeId, purpose) {
    const challenge = await models.LoginOtp.findByPk(challengeId);
    assertUsable(challenge, purpose);

    const secondsSinceCreated = (Date.now() - new Date(challenge.createdAt).getTime()) / 1000;
    if (secondsSinceCreated < config.otpResendCooldownSeconds) {
      throw boom.tooManyRequests('Espera unos segundos antes de solicitar un nuevo código.');
    }

    if (challenge.resendCount >= challenge.maxResends) {
      throw boom.tooManyRequests('Has alcanzado el límite de reenvíos. Vuelve a iniciar sesión.');
    }

    // userCode puede ser un código de empleado o de cliente (ver
    // customers.service.js#login, que reutiliza este mismo servicio) -no hay
    // forma de saber cuál sin mirar 'purpose', así que se prueba primero en
    // users y, si no está, en customers-.
    const user = await models.User.findByPk(challenge.userCode) || await models.Customer.findByPk(challenge.userCode);
    if (!user) throw boom.unauthorized('Código inválido o expirado');

    const code = generateCode();
    const expiresAt = new Date(Date.now() + config.otpExpirationMinutes * 60 * 1000);

    await challenge.update({
      codeHash: hashCode(code),
      attempts: 0,
      resendCount: challenge.resendCount + 1,
      expiresAt
    });

    await this.#dispatchEmail(user, code, purpose);

    return { expiresInSeconds: config.otpExpirationMinutes * 60 };
  }

  async #dispatchEmail(user, code, purpose) {
    const isReset = purpose === 'PASSWORD_RESET' || purpose === 'CUSTOMER_PASSWORD_RESET';
    const subject = isReset
      ? 'Restablece tu contraseña - Horeb ERP'
      : 'Tu código de verificación - Horeb ERP';
    const intro = isReset
      ? 'Has solicitado restablecer tu contraseña. Tu código es:'
      : 'Tu código de acceso es:';
    const footer = isReset
      ? 'Si no has sido tú, ignora este correo: tu contraseña actual sigue siendo válida.'
      : 'Si no has sido tú, ignora este correo.';

    try {
      await sendEmail({
        to: user.email,
        subject,
        // fullName es de User; Customer usa 'name' -sin este fallback saldría
        // "Hola undefined," para los clientes.
        html: `<p>Hola ${user.fullName || user.name || ''},</p>` +
          `<p>${intro}</p>` +
          `<h2 style="letter-spacing:4px">${code}</h2>` +
          `<p>Caduca en ${config.otpExpirationMinutes} minutos. ${footer}</p>`,
        text: `${intro} ${code}. Caduca en ${config.otpExpirationMinutes} minutos.`
      });
    } catch (error) {
      // El cliente solo ve el mensaje genérico de abajo; la causa real (ej.
      // dominio no verificado en Resend, API key inválida) queda en el log
      // interno, si no, es imposible de diagnosticar en remoto.
      logger.error(`Fallo al enviar OTP a ${user.email}: ${error.message}`, { stack: error.stack });
      throw boom.badGateway('No se pudo enviar el código por correo. Inténtalo de nuevo en unos minutos.');
    }
  }
}

module.exports = OtpService;
