const { getConfig } = require('../config/config');

/**
 * Envío de email transaccional vía la API HTTP de Resend.
 * Se usa el `fetch` nativo de Node 18 a propósito: evita añadir un cliente SMTP
 * (puertos 587/465 suelen estar bloqueados en redes de cliente) y no añade
 * dependencias nuevas que empaquetar con `pkg`.
 */
async function sendEmail({ to, subject, html, text }) {
  const config = getConfig();

  if (!config.resendApiKey) {
    throw new Error('RESEND_API_KEY no está configurado: no se puede enviar correo.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.mailFrom,
      to,
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Fallo al enviar email vía Resend (HTTP ${response.status}): ${errorBody}`);
  }

  return response.json();
}

module.exports = { sendEmail };
