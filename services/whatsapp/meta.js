'use strict';

/**
 * Proveedor: WhatsApp Cloud API de Meta (directo, sin Twilio).
 *
 * Docs:
 *   - Mensajería:      https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 *   - Plantillas:      https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 *   - Webhook entrante: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 *   - Verificación:    https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 *   - Firma:           https://developers.facebook.com/docs/messenger-platform/webhooks#validate-payloads
 *
 * Diferencias respecto a Twilio (relevantes para el resto del código):
 *
 *  1. No usa un "From" prefijado con `whatsapp:`. El emisor se identifica con
 *     un `WHATSAPP_PHONE_NUMBER_ID` (no es el teléfono sino el id que Meta
 *     genera al registrar el número). Las direcciones de destinatario son
 *     puros E.164 SIN el `+` opcional (Meta acepta ambos).
 *  2. Un único webhook recibe TANTO mensajes entrantes como cambios de estado
 *     (delivered/sent/read/failed) en una sola carga JSON, dentro de
 *     `entry[].changes[].value.messages` y `…value.statuses`.
 *  3. El primer mensaje a un usuario que NUNCA escribió antes debe ser una
 *     plantilla aprobada por Meta (helper `sendTemplate`). Una vez que el
 *     usuario responde, se abre una ventana de 24h donde puede recibir texto
 *     libre y documentos (`sendMessage`).
 *  4. Firma del webhook: HMAC-SHA256 del raw body, encabezado
 *     `X-Hub-Signature-256: sha256=<hex>`. Usamos `req.rawBody` (capturado en
 *     `server.js`).
 *  5. Verificación del webhook (handshake): GET con `hub.mode=subscribe`,
 *     `hub.verify_token`, `hub.challenge`. Se responde con el `challenge`
 *     tal cual. Lo expone el helper `handleVerification`.
 *
 * Contrato compatible con `services/whatsapp/twilio.js` para no tocar el
 * resto del backend:
 *   - sendMessage({ to, body, mediaUrl?, channel?, statusCallback? }) → { sid, channel }
 *   - sendSms(...) → throws (Meta no envía SMS)
 *   - verifyIncomingSignature(req) → boolean
 *   - parseIncomingMessage(req) → { from, canal, body, numMedia }
 *   - parseStatusCallback(req) → { messageSid, status, canal, to, … }
 *   - parseEvents(req) → { messages: [...], statuses: [...] }   ← útil para Meta
 *   - normalizeNumber(raw) → E.164
 *   - detectarCanal(raw) → siempre 'whatsapp'
 *
 * Extras específicos de Meta:
 *   - sendTemplate({ to, templateName, languageCode, components })
 *   - handleVerification(req, res)  ← responde el handshake GET
 */

const crypto = require('node:crypto');
const { normalizarTelefono } = require('../../utils/normalizarTelefono');

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0';

function envOrThrow(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`[whatsapp:meta] Falta variable de entorno ${name}.`);
  }
  return String(v).trim();
}

/** E.164 sin "+" (Meta lo prefiere así en payloads; igual acepta con `+`). */
function toMetaAddress(raw) {
  const e164 = normalizarTelefono(raw);
  if (!e164) return '';
  return e164.replace(/^\+/, '');
}

function normalizeNumber(raw) {
  const e164 = normalizarTelefono(raw);
  return e164 || String(raw || '').replace(/^whatsapp:/i, '').trim();
}

function detectarCanal(_addressRaw) {
  // Meta solo opera WhatsApp.
  return 'whatsapp';
}

// ---------------------------------------------------------------------------
// Envío
// ---------------------------------------------------------------------------

async function _postGraph(path, body) {
  const phoneId = envOrThrow('WHATSAPP_PHONE_NUMBER_ID');
  const token = envOrThrow('WHATSAPP_ACCESS_TOKEN');
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(phoneId)}/${path}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* no-op */ }

  if (!resp.ok) {
    const err = new Error(
      `[whatsapp:meta] HTTP ${resp.status}: ${json?.error?.message || text || 'sin detalle'}`
    );
    err.status = resp.status;
    err.detail = json || text;
    throw err;
  }
  return json;
}

/**
 * Envía un mensaje en formato libre (solo válido dentro de la ventana de 24h
 * tras la última respuesta del usuario; fuera de esa ventana usar `sendTemplate`).
 *
 * Si `mediaUrl` está presente se envía como documento; Meta descarga el
 * archivo desde esa URL pública. Si además llega `body`, se usa como caption.
 *
 * `channel` y `statusCallback` se aceptan por compatibilidad de interfaz pero
 * Meta solo opera WhatsApp y los status callbacks van por el mismo webhook
 * (no hay URL separada que pasar en el envío).
 */
async function sendMessage({ to, body, mediaUrl, channel, statusCallback }) {
  if (!to) throw new Error('[whatsapp:meta] sendMessage: "to" es requerido.');
  if (channel && channel !== 'whatsapp') {
    throw new Error('[whatsapp:meta] sendMessage solo soporta canal whatsapp.');
  }
  if (statusCallback) {
    // Lo aceptamos para no romper la firma del provider; Meta no lo usa.
  }
  if (!body && !mediaUrl) {
    throw new Error('[whatsapp:meta] sendMessage: "body" o "mediaUrl" es requerido.');
  }

  const toMeta = toMetaAddress(to);
  const payload = { messaging_product: 'whatsapp', to: toMeta };

  if (mediaUrl) {
    payload.type = 'document';
    payload.document = {
      link: String(mediaUrl),
      filename: 'cotizacion.xlsx',
      ...(body ? { caption: String(body) } : {}),
    };
  } else {
    payload.type = 'text';
    payload.text = { body: String(body), preview_url: false };
  }

  const json = await _postGraph('messages', payload);
  const sid = json?.messages?.[0]?.id || '';
  return { sid, channel: 'whatsapp', raw: json };
}

/**
 * Envía una plantilla pre-aprobada por Meta. Único formato válido para
 * iniciar conversación (fuera de la ventana de 24h).
 *
 * @example
 *   sendTemplate({
 *     to: '+51987654321',
 *     templateName: 'cotizacion_pendiente',
 *     languageCode: 'es_PE',
 *     components: [
 *       { type: 'body', parameters: [
 *           { type: 'text', text: 'COT-0001' },
 *           { type: 'text', text: 'ACME S.A.' },
 *           { type: 'text', text: 'S/ 1500.00' },
 *       ]},
 *     ],
 *   })
 */
async function sendTemplate({ to, templateName, languageCode, components }) {
  if (!to) throw new Error('[whatsapp:meta] sendTemplate: "to" es requerido.');
  if (!templateName) throw new Error('[whatsapp:meta] sendTemplate: "templateName" es requerido.');

  const payload = {
    messaging_product: 'whatsapp',
    to: toMetaAddress(to),
    type: 'template',
    template: {
      name: String(templateName),
      language: { code: String(languageCode || 'es') },
      ...(Array.isArray(components) && components.length ? { components } : {}),
    },
  };

  const json = await _postGraph('messages', payload);
  const sid = json?.messages?.[0]?.id || '';
  return { sid, channel: 'whatsapp', raw: json };
}

/** Meta no envía SMS — se conserva el método para que el `controller` falle limpio. */
async function sendSms() {
  throw new Error('[whatsapp:meta] El proveedor Meta no envía SMS. Configure WHATSAPP_PROVIDER=twilio para SMS o use Telegram.');
}

// ---------------------------------------------------------------------------
// Webhook: verificación del handshake GET
// ---------------------------------------------------------------------------

/**
 * Maneja el GET de verificación que Meta envía una sola vez al guardar la URL
 * en Business Manager:
 *   GET /…/webhook?hub.mode=subscribe&hub.verify_token=…&hub.challenge=123
 * Responde con el challenge si el token coincide con
 * `WHATSAPP_WEBHOOK_VERIFY_TOKEN`; de lo contrario 403.
 *
 * Se exporta como middleware para mapearlo directamente en `whatsappRoutes`.
 */
function handleVerification(req, res) {
  const mode = req.query?.['hub.mode'];
  const token = req.query?.['hub.verify_token'];
  const challenge = req.query?.['hub.challenge'];
  const expected = String(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '').trim();

  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return res.status(200).send(String(challenge));
  }
  return res.status(403).send('Forbidden');
}

// ---------------------------------------------------------------------------
// Webhook: firma + parseo
// ---------------------------------------------------------------------------

/**
 * Verifica la firma HMAC-SHA256 que Meta envía en `X-Hub-Signature-256`.
 *
 * El secreto es el App Secret (NO el access token de usuario). Si la app no
 * está configurada o no llega cabecera, devolvemos `false` y el controller
 * rechaza el webhook con 403.
 *
 * Nota: usamos `req.rawBody` que se captura en `server.js` con el hook
 * `verify` de `express.json`. Si en algún momento se ejecuta este middleware
 * sin haber preservado el buffer, intentamos recomponerlo, aunque eso solo
 * funciona si el JSON original no traía espacios o claves Unicode raras.
 */
function verifyIncomingSignature(req) {
  const headerSig =
    req.headers['x-hub-signature-256'] || req.headers['X-Hub-Signature-256'];
  if (!headerSig) return false;
  const secret = String(process.env.WHATSAPP_APP_SECRET || '').trim();
  if (!secret) {
    console.warn(
      '[whatsapp:meta] WHATSAPP_APP_SECRET no configurado; no se puede verificar firma.'
    );
    return false;
  }

  const rawBuf = req.rawBody instanceof Buffer
    ? req.rawBody
    : Buffer.from(JSON.stringify(req.body || {}), 'utf8');

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBuf)
    .digest('hex');

  const a = Buffer.from(String(headerSig));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Devuelve el primer mensaje entrante (compatible con la interfaz Twilio).
 * Si el webhook traía únicamente status updates, devuelve `null`.
 */
function parseIncomingMessage(req) {
  const events = parseEvents(req);
  const msg = events.messages[0];
  if (!msg) return { from: '', canal: 'whatsapp', body: '', numMedia: 0 };
  return msg;
}

/** Devuelve el primer status update. Si el webhook era un mensaje, `null`. */
function parseStatusCallback(req) {
  const events = parseEvents(req);
  const st = events.statuses[0];
  if (!st) {
    return { messageSid: '', status: '', canal: 'whatsapp', to: '', from: '', errorCode: null, errorMessage: null };
  }
  return st;
}

/**
 * Extrae TODOS los mensajes y status updates de un webhook de Meta. Útil para
 * el controller, que puede iterar y procesar varios eventos en un mismo POST.
 */
function parseEvents(req) {
  const body = req.body || {};
  const messages = [];
  const statuses = [];

  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value || {};

      const msgs = Array.isArray(value.messages) ? value.messages : [];
      for (const m of msgs) {
        const text =
          m?.text?.body ??
          m?.button?.text ??
          m?.interactive?.button_reply?.title ??
          m?.interactive?.list_reply?.title ??
          '';
        const numMedia =
          (m.image || m.document || m.audio || m.video || m.sticker) ? 1 : 0;
        messages.push({
          from: normalizeNumber(m.from),
          canal: 'whatsapp',
          body: String(text || ''),
          numMedia,
          messageSid: String(m.id || ''),
          raw: m,
        });
      }

      const sts = Array.isArray(value.statuses) ? value.statuses : [];
      for (const s of sts) {
        statuses.push({
          messageSid: String(s.id || ''),
          status: String(s.status || '').toLowerCase(),
          canal: 'whatsapp',
          to: normalizeNumber(s.recipient_id || ''),
          from: normalizeNumber(value?.metadata?.display_phone_number || ''),
          errorCode: Number(s?.errors?.[0]?.code) || null,
          errorMessage: s?.errors?.[0]?.message || s?.errors?.[0]?.title || null,
          raw: s,
        });
      }
    }
  }

  return { messages, statuses };
}

module.exports = {
  // Contrato compartido con Twilio:
  sendMessage,
  sendSms,
  verifyIncomingSignature,
  parseIncomingMessage,
  parseStatusCallback,
  normalizeNumber,
  detectarCanal,
  // Específicos de Meta:
  sendTemplate,
  parseEvents,
  handleVerification,
};
