const boom = require('@hapi/boom');
const { models } = require('../libs/sequelize');
const cryptoHelper = require('../libs/crypto');
const MailService = require('./mail.service');

const mailService = new MailService();

/**
 * Cuenta de correo IMAP personal (ver db/models/mailAccount.model.js): una
 * por usuario. La contraseña nunca se devuelve en claro (mismo patrón que
 * VerifactuConfigService#toSafeJSON).
 */
class MailAccountService {
  #toSafeJSON(account) {
    const data = account.toJSON ? account.toJSON() : { ...account };
    delete data.passwordEncrypted;
    return data;
  }

  async findForUser(userCode) {
    const account = await models.MailAccount.findOne({ where: { userCode } });
    return account ? this.#toSafeJSON(account) : null;
  }

  async #findRawForUser(userCode) {
    const account = await models.MailAccount.findOne({ where: { userCode } });
    if (!account) throw boom.notFound('No tienes configurada ninguna cuenta de correo.');
    return account;
  }

  /**
   * Prueba las credenciales contra el servidor IMAP antes de guardar nada,
   * y solo entonces cifra la contraseña y hace el upsert (create o update).
   */
  async saveForUser(userCode, data) {
    const { password, ...raw } = data;
    // El validador solo comprueba el body, no aplica los .default() de Joi
    // (ver middlewares/validator.handler.js), así que los completamos aquí.
    const rest = {
      ...raw,
      imapPort: raw.imapPort ?? 993,
      imapSecure: raw.imapSecure ?? true,
    };

    await mailService.testConnection({
      imapHost: rest.imapHost,
      imapPort: rest.imapPort,
      imapSecure: rest.imapSecure,
      username: rest.username,
      password,
    });

    const payload = {
      ...rest,
      userCode,
      passwordEncrypted: cryptoHelper.encrypt(password),
      lastSeenUid: null,
      lastCheckedAt: null,
    };

    const existing = await models.MailAccount.findOne({ where: { userCode } });
    const account = existing
      ? await existing.update(payload)
      : await models.MailAccount.create(payload);

    return this.#toSafeJSON(account);
  }

  async deleteForUser(userCode) {
    const account = await models.MailAccount.findOne({ where: { userCode } });
    if (!account) throw boom.notFound('No tienes configurada ninguna cuenta de correo.');
    await account.destroy();
    return { userCode };
  }

  /**
   * Uso interno (routers de mail/notifications): la única vía que expone la
   * fila completa, incluida la contraseña cifrada, para poder conectarse.
   */
  async getRawForUser(userCode) {
    return this.#findRawForUser(userCode);
  }

  async updateLastSeenUid(userCode, lastSeenUid) {
    await models.MailAccount.update(
      { lastSeenUid, lastCheckedAt: new Date() },
      { where: { userCode } }
    );
  }
}

module.exports = MailAccountService;
