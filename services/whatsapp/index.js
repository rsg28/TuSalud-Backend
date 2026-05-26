'use strict';

/**
 * Capa de abstracción del proveedor de WhatsApp.
 *
 * Hoy implementa Twilio (sandbox y producción) y un modo `null` para entornos
 * de desarrollo donde no queremos hacer llamadas reales. Mañana se puede agregar
 * Meta WhatsApp Cloud API u otro proveedor sin tocar el resto del backend:
 * basta agregar un archivo nuevo en este folder que exporte el mismo contrato.
 *
 * Contrato del provider:
 *   - sendMessage({ to, body, mediaUrl? }) → { sid: string } | throws
 *   - verifyIncomingSignature(req) → boolean
 *   - parseIncomingMessage(req) → { from, body, numMedia }
 *   - normalizeNumber(raw) → string (formato canónico para guardar en BD)
 *
 * El selector lee `process.env.WHATSAPP_PROVIDER` (por defecto `null`).
 */

const twilioProvider = require('./twilio');
const metaProvider = require('./meta');
const nullProvider = require('./null');

let cachedProvider = null;

function getProvider() {
  if (cachedProvider) return cachedProvider;
  const id = String(process.env.WHATSAPP_PROVIDER || 'null').toLowerCase().trim();
  switch (id) {
    case 'meta':
    case 'whatsapp_cloud':
    case 'cloud':
      cachedProvider = metaProvider;
      break;
    case 'twilio':
      cachedProvider = twilioProvider;
      break;
    case 'null':
    case 'disabled':
    case '':
      cachedProvider = nullProvider;
      break;
    default:
      console.warn(
        `[whatsapp] proveedor desconocido "${id}", usando "null" (no envía).`
      );
      cachedProvider = nullProvider;
  }
  return cachedProvider;
}

/** Solo para tests: olvida el provider cacheado tras mutar env. */
function _resetProviderCache() {
  cachedProvider = null;
}

module.exports = {
  getProvider,
  _resetProviderCache,
};
