/**
 * Cliente HTTP genérico para un proveedor Veri*factu externo. Punto de
 * partida razonable (POST del payload como JSON, Bearer + secret en
 * cabecera) a ajustar cuando se elija el proveedor real: cambia aquí la
 * ruta/cabeceras/forma del body y del parseo de la respuesta, sin tocar
 * quien lo llama (services/salesPostInvoice.service.js) ni cómo se guarda
 * el resultado (services/verifactulogs.service.js#applyProviderResponse).
 *
 * Contrato de salida fijo (lo único que debe respetarse pase lo que pase):
 *   { accepted: boolean, externalReference?: string, qrData?: string, error?: string }
 */
class VerifactuProviderClient {
  /**
   * @param {object} config - fila activa de verifactu_config (apiBaseUrl, apiKey, apiSecret, providerName)
   * @param {object} payload - el mismo objeto que se guarda en verifactu_logs.payload
   * @returns {Promise<{accepted: boolean, externalReference?: string, qrData?: string, error?: string}>}
   */
  async submit(config, payload) {
    if (!config?.apiBaseUrl) {
      return { accepted: false, error: 'El proveedor Veri*factu no tiene apiBaseUrl configurada.' };
    }

    let response;
    try {
      response = await fetch(config.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey || ''}`,
          ...(config.apiSecret ? { 'X-Api-Secret': config.apiSecret } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      return { accepted: false, error: `Error de conexión con el proveedor: ${error.message}` };
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        accepted: false,
        error: body.message || body.error || `El proveedor respondió con HTTP ${response.status}`,
      };
    }

    // Nombres de campo "razonables" a modo de plantilla -el proveedor real
    // casi seguro usará otros, ajustar aquí cuando se conozca-.
    return {
      accepted: body.accepted ?? true,
      externalReference: body.externalReference || body.csv || body.reference || null,
      qrData: body.qrData || body.qr || null,
    };
  }
}

module.exports = VerifactuProviderClient;
