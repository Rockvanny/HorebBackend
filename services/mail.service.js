const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const boom = require('@hapi/boom');
const cryptoHelper = require('../libs/crypto');

/**
 * Acceso IMAP de solo lectura a la bandeja de entrada de la cuenta de correo
 * personal del usuario (ver services/mailAccount.service.js). No hay cron:
 * cada operación abre y cierra su propia conexión, disparada bajo demanda
 * desde el frontend (ver routes/mail.router.js).
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

  async #withAccountClient(mailAccount, fn) {
    const client = this.#buildClient({
      imapHost: mailAccount.imapHost,
      imapPort: mailAccount.imapPort,
      imapSecure: mailAccount.imapSecure,
      username: mailAccount.username,
      password: cryptoHelper.decrypt(mailAccount.passwordEncrypted),
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
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

  async fetchMessage(mailAccount, uid) {
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
      };
    });
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
