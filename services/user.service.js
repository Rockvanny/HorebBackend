const crypto = require('crypto');
const { Op } = require('sequelize');
const boom = require('@hapi/boom');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { models } = require('../libs/sequelize');
const { getConfig } = require('../config/config');
const { maskEmail } = require('../libs/maskEmail');
const OtpService = require('./otp.service');

const config = getConfig();
const otpService = new OtpService();
const LOGIN_OTP_PURPOSE = 'LOGIN_2FA';
const PASSWORD_RESET_PURPOSE = 'PASSWORD_RESET';
const ROLES = ['master', 'admin', 'financiero', 'vendedor', 'externo', 'viewer'];

class UserService {
  constructor() { }

  async findPaginated({ limit, offset, searchTerm }) {
    const parsedLimit = parseInt(limit, 10) || 100;
    const parsedOffset = parseInt(offset, 10) || 0;

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      order: [['full_name', 'ASC']],
      attributes: { exclude: ['password'] },
      where: {},
    };

    if (searchTerm) {
      const term = searchTerm.trim();
      const searchPattern = `%${term}%`;
      options.where[Op.or] = [
        { code: { [Op.iLike]: searchPattern } },
        { fullName: { [Op.iLike]: searchPattern } },
        { email: { [Op.iLike]: searchPattern } }
      ];
    }

    try {
      const { count, rows } = await models.User.findAndCountAll(options);
      return {
        records: rows,
        hasMore: (parsedOffset + rows.length) < count,
        total: count,
      };
    } catch (error) {
      throw boom.badImplementation('Error al consultar usuarios paginados', error);
    }
  }

  /**
   * PASO 1 del login: valida email + contraseña. Si son correctos, NO emite
   * token todavía: crea un reto OTP y envía el código por email. El JWT solo
   * se emite tras verificar ese código en verifyLoginOtp().
   */
  async login(email, password) {
    const user = await models.User.findOne({ where: { email } });

    if (!user) {
      // Distinguimos "no hay ningún usuario todavía" (instalación nueva) de
      // "email no encontrado" (que sería enumeración de cuentas). Solo lo
      // primero se señaliza aparte: es la señal que necesita el frontend
      // para saber que debe mostrar el asistente de alta del primer admin
      // en vez de un login normal, por si no llamó antes a needs-setup.
      const userCount = await models.User.count();
      if (userCount === 0) {
        throw boom.preconditionRequired(
          'No hay ningún usuario creado todavía. Crea el primer administrador antes de iniciar sesión.'
        );
      }
      throw boom.unauthorized('Usuario o contraseña incorrectos');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw boom.unauthorized('Usuario o contraseña incorrectos');

    return otpService.createChallenge(user, LOGIN_OTP_PURPOSE);
  }

  /**
   * PASO 2 del login: verifica el código OTP asociado al reto y, si es
   * correcto, emite el JWT de sesión.
   */
  async verifyLoginOtp(challengeId, code) {
    const userCode = await otpService.verifyChallenge(challengeId, code, LOGIN_OTP_PURPOSE);

    const user = await models.User.findByPk(userCode);
    if (!user) throw boom.unauthorized('Usuario o contraseña incorrectos');

    return this.#buildSession(user);
  }

  /**
   * Reenvía un nuevo código para un reto de login pendiente (cooldown y
   * límite de reenvíos gestionados en OtpService).
   */
  async resendLoginOtp(challengeId) {
    return otpService.resendChallenge(challengeId, LOGIN_OTP_PURPOSE);
  }

  /**
   * PASO 1 del reseteo de contraseña sin sesión previa ("olvidé mi
   * contraseña"). Si el email existe, envía un OTP de propósito
   * PASSWORD_RESET. Si no existe, devuelve una respuesta con la misma forma
   * (challengeId falso, sin crear reto ni enviar correo) para no filtrar por
   * el contenido de la respuesta si un email está registrado o no.
   */
  async requestPasswordReset(email) {
    const user = await models.User.findOne({ where: { email } });

    if (!user) {
      return {
        challengeId: crypto.randomUUID(),
        expiresInSeconds: config.otpExpirationMinutes * 60,
        maskedEmail: maskEmail(email)
      };
    }

    return otpService.createChallenge(user, PASSWORD_RESET_PURPOSE);
  }

  /**
   * PASO 2: verifica el OTP de reseteo y, si es correcto, fija la nueva
   * contraseña directamente. No exige la contraseña actual (a diferencia de
   * updatePassword): la prueba de identidad aquí es tener acceso al email,
   * no la sesión ni la contraseña previa.
   */
  async resetPassword(challengeId, code, newPassword) {
    const userCode = await otpService.verifyChallenge(challengeId, code, PASSWORD_RESET_PURPOSE);

    const user = await models.User.findByPk(userCode);
    if (!user) throw boom.unauthorized('Código inválido o expirado');

    await user.update({ password: newPassword, mustChangePassword: false });

    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Reenvía un nuevo código para un reto de reseteo de contraseña pendiente.
   */
  async resendPasswordReset(challengeId) {
    return otpService.resendChallenge(challengeId, PASSWORD_RESET_PURPOSE);
  }

  #buildSession(user) {
    const userData = user.toJSON();

    const payload = {
      sub: userData.code,
      role: userData.role
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });

    delete userData.password;
    return { user: userData, token };
  }

  async findOne(id) {
    const user = await models.User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) throw boom.notFound('Usuario no encontrado');
    return user;
  }

  /**
     * CREAR: Añadido userExecutor para auditoría.
     */
    async create(data, userExecutor) {
        const newUser = await models.User.create(data, { userExecutor });
        const { password, ...userWithoutPassword } = newUser.toJSON();
        return userWithoutPassword;
    }

  /**
   * Crea el primer usuario de una instalación nueva (rol admin con todos los
   * módulos activos). Solo puede usarse mientras no exista ningún usuario:
   * sustituye al antiguo seed de un admin fijo por variables de entorno.
   */
  async createFirstAdmin({ fullName, email, password }) {
    const count = await models.User.count();
    if (count > 0) {
      throw boom.forbidden('Ya existe al menos un usuario en esta instalación');
    }

    const newUser = await models.User.create({
      fullName,
      email,
      password,
      role: 'admin',
      mustChangePassword: false,
      allowGestion: true,
      allowSales: true,
      allowPurchases: true,
      allowReports: true,
      allowSettings: true
    });

    const { password: _password, ...userWithoutPassword } = newUser.toJSON();
    return userWithoutPassword;
  }

  async update(id, changes, userExecutor) {
    const user = await this.findOne(id);
    const updatedUser = await user.update(changes, { userExecutor });
    const { password, ...userWithoutPassword } = updatedUser.toJSON();
    return userWithoutPassword;
  }

  /**
   * Cambio de contraseña propio (primer login con mustChangePassword=true,
   * o cambio voluntario). Exige conocer la contraseña actual: el llamador
   * (router) ya ha verificado que `id` coincide con el usuario autenticado.
   */
  async updatePassword(id, currentPassword, newPassword) {
    const user = await models.User.findByPk(id);
    if (!user) throw boom.notFound('Usuario no encontrado');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw boom.unauthorized('La contraseña actual no es correcta');

    await user.update({
      password: newPassword,
      mustChangePassword: false
    });

    const userJson = user.toJSON();
    delete userJson.password;

    return {
      message: 'Contraseña actualizada correctamente',
      user: userJson
    };
  }

  async delete(id) {
    const user = await this.findOne(id);
    await user.destroy();
    return { id };
  }
}

module.exports = UserService;
