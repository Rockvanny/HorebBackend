const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const boom = require('@hapi/boom');
const cryptoHelper = require('../libs/crypto');

/**
 * Acceso IMAP (lectura) y SMTP (envío) a la cuenta de correo personal del
 * usuario (ver services/mailAccount.service.js). No hay cron: cada operación
 * abre y cierra su propia conexión, disparada bajo demanda desde el frontend
 * (ver routes/mail.router.js).
 */
class MailService {
  #buildClient({ imapHost, imapPort, imapSecure, username, password }) {
    return new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: imapSecure,
      auth: { user: username, pass: password },
      logger: false,
    });
  }

  #buildSmtpTransport({ smtpHost, smtpPort, smtpSecure, username, password }) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: username, pass: password },
    });
  }

  #formatAddress(addr) {
    if (!addr) return '';
    return `${addr.name ? `${addr.name} ` : ''}<${addr.address}>`.trim();
  }

  /**
   * Prueba unas credenciales sin persistir nada. Se usa al dar de alta o
   * cambiar la cuenta de correo, para avisar de inmediato si están mal.
   */
  async testConnection(credentials) {
    const client = this.#buildClient(credentials);
    try {
      await client.connect();
    } catch (error) {
      throw boom.badRequest(`No se pudo conectar con el servidor de correo: ${error.message}`);
    } finally {
      try { await client.logout(); } catch (_) { /* conexión ya caída, no pasa nada */ }
    }
    return true;
  }

  /**
   * Prueba las credenciales SMTP (correo saliente), igual que
   * testConnection() hace con IMAP: se usa al dar de alta o cambiar la
   * cuenta, antes de guardar nada.
   */
  async testSmtpConnection(credentials) {
    const transport = this.#buildSmtpTransport(credentials);
    try {
      await transport.verify();
    } catch (error) {
      throw boom.badRequest(`No se pudo conectar con el servidor de correo saliente: ${error.message}`);
    }
    return true;
  }

  /**
   * Envía un correo (nuevo o respuesta) desde la cuenta personal del
   * usuario. `inReplyTo`/`references` son opcionales, para hilos de
   * respuesta (ver RFC 5322).
   */
  async sendMail(mailAccount, { to, subject, html, text, inReplyTo, references }) {
    const transport = this.#buildSmtpTransport({
      smtpHost: mailAccount.smtpHost,
      smtpPort: mailAccount.smtpPort,
      smtpSecure: mailAccount.smtpSecure,
      username: mailAccount.username,
      password: cryptoHelper.decrypt(mailAccount.passwordEncrypted),
    });

    try {
      return await transport.sendMail({
        from: mailAccount.email,
        to,
        subject,
        html,
        text,
        inReplyTo,
        references,
      });
    } catch (error) {
      throw boom.badGateway(`Error enviando el correo: ${error.message}`);
    }
  }

  /**
   * El nombre real de la carpeta de enviados varía por proveedor ("Sent",
   * "Sent Items", "INBOX.Enviados"...). Primero se busca por el atributo
   * estándar \Sent (RFC 6154, SPECIAL-USE); si el servidor no lo anuncia, se
   * cae a los nombres más habituales.
   */
  async #resolveSentMailboxPath(client) {
    const mailboxes = await client.list();

    const bySpecialUse = mailboxes.find((box) => box.specialUse === '\\Sent');
    if (bySpecialUse) return bySpecialUse.path;

    const commonNames = ['Sent', 'Sent Items', 'Sent Messages', 'INBOX.Sent', 'Enviados', 'INBOX.Enviados'];
    const byName = mailboxes.find((box) => commonNames.includes(box.path) || commonNames.includes(box.name));
    if (byName) return byName.path;

    throw boom.badGateway('No se encontró la carpeta de correos enviados en el servidor.');
  }

  async #withAccountClient(mailAccount, fn, mailbox = 'INBOX') {
    const client = this.#buildClient({
      imapHost: mailAccount.imapHost,
      imapPort: mailAccount.imapPort,
      imapSecure: mailAccount.imapSecure,
      username: mailAccount.username,
      password: cryptoHelper.decrypt(mailAccount.passwordEncrypted),
    });

    try {
      await client.connect();
      const mailboxPath = mailbox === 'SENT' ? await this.#resolveSentMailboxPath(client) : mailbox;
      const lock = await client.getMailboxLock(mailboxPath);
      try {
        return await fn(client);
      } finally {
        lock.release();
      }
    } catch (error) {
      if (boom.isBoom(error)) throw error;
      throw boom.badGateway(`Error accediendo al correo: ${error.message}`);
    } finally {
      try { await client.logout(); } catch (_) { /* nada que hacer si ya se cortó */ }
    }
  }

  /**
   * Lista paginada de la bandeja de entrada, más recientes primero. IMAP no
   * tiene offset/limit nativo por fecha, así que se pagina por número de
   * secuencia (1..exists, de más antiguo a más reciente) y se invierte.
   */
  async fetchInbox(mailAccount, { limit = 25, offset = 0 } = {}) {
    return this.#withAccountClient(mailAccount, async (client) => {
      const total = client.mailbox.exists;
      if (!total) return { messages: [], total: 0 };

      const to = Math.max(1, total - offset);
      const from = Math.max(1, total - offset - limit + 1);
      if (from > to) return { messages: [], total };

      const messages = [];
      for await (const msg of client.fetch(`${from}:${to}`, { envelope: true, flags: true })) {
        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject || '(sin asunto)',
          from: this.#formatAddress(msg.envelope?.from?.[0]),
          date: msg.envelope?.date || null,
          isRead: msg.flags?.has('\\Seen') || false,
        });
      }

      messages.sort((a, b) => new Date(b.date) - new Date(a.date));
      return { messages, total };
    });
  }

  /** Igual que fetchInbox pero sobre la carpeta de enviados, y con "to" en vez de "from". */
  async fetchSent(mailAccount, { limit = 25, offset = 0 } = {}) {
    return this.#withAccountClient(mailAccount, async (client) => {
      const total = client.mailbox.exists;
      if (!total) return { messages: [], total: 0 };

      const to = Math.max(1, total - offset);
      const from = Math.max(1, total - offset - limit + 1);
      if (from > to) return { messages: [], total };

      const messages = [];
      for await (const msg of client.fetch(`${from}:${to}`, { envelope: true, flags: true })) {
        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject || '(sin asunto)',
          to: this.#formatAddress(msg.envelope?.to?.[0]),
          date: msg.envelope?.date || null,
          isRead: msg.flags?.has('\\Seen') || false,
        });
      }

      messages.sort((a, b) => new Date(b.date) - new Date(a.date));
      return { messages, total };
    }, 'SENT');
  }

  async fetchMessage(mailAccount, uid, mailbox = 'INBOX') {
    return this.#withAccountClient(mailAccount, async (client) => {
      const { content } = await client.download(uid, undefined, { uid: true });
      const parsed = await simpleParser(content);

      return {
        uid,
        subject: parsed.subject || '(sin asunto)',
        from: parsed.from?.text || '',
        to: parsed.to?.text || '',
        date: parsed.date || null,
        html: parsed.html || null,
        text: parsed.text || '',
        // Para hilos de respuesta (ver sendMail): References = históricas + este mensaje.
        messageId: parsed.messageId || null,
        references: [...(parsed.references || []), ...(parsed.messageId ? [parsed.messageId] : [])].join(' '),
      };
    }, mailbox);
  }

  /**
   * Detecta mensajes nuevos desde el último `lastSeenUid` guardado. En la
   * primera revisión de una cuenta (lastSeenUid nulo) no genera "nuevos" —
   * solo fija la marca de partida — para no inundar de notificaciones todo
   * el histórico del buzón la primera vez que el usuario lo conecta.
   */
  async checkNewMessages(mailAccount) {
    return this.#withAccountClient(mailAccount, async (client) => {
      const highestUid = client.mailbox.uidNext - 1;

      if (!mailAccount.lastSeenUid) {
        return { newMessages: [], newLastSeenUid: highestUid > 0 ? highestUid : null };
      }

      if (highestUid <= mailAccount.lastSeenUid) {
        return { newMessages: [], newLastSeenUid: mailAccount.lastSeenUid };
      }

      const range = `${mailAccount.lastSeenUid + 1}:${highestUid}`;
      const newMessages = [];
      for await (const msg of client.fetch(range, { envelope: true }, { uid: true })) {
        newMessages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject || '(sin asunto)',
          from: this.#formatAddress(msg.envelope?.from?.[0]),
        });
      }

      return { newMessages, newLastSeenUid: highestUid };
    });
  }
}

module.exports = MailService;
