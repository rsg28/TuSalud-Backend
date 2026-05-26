'use strict';

/**
 * Proveedor WhatsApp + SMS basado en Twilio.
 *
 * No usamos el SDK oficial para no agregar una dependencia extra: la API REST
 * de Twilio es un simple POST con Basic Auth y la verificación de los webhooks
 * usa HMAC-SHA1 (`X-Twilio-Signature`) que la librería estándar `node:crypto`
 * resuelve sin problemas.
 *
 * Soporta dos canales sobre la misma API:
 *   - WhatsApp: From/To con prefijo "whatsapp:". Acepta media (MediaUrl).
 *   - SMS: From/To con número en E.164 sin prefijo. No acepta media.
 *
 * Variables de entorno:
 *   TWILIO_ACCOUNT_SID         - SID de la cuenta (AC…)
 *   TWILIO_AUTH_TOKEN          - token de auth (también clave para verificar firma)
 *   TWILIO_WHATSAPP_FROM       - emisor WhatsApp, formato "whatsapp:+14155238886"
 *                                (sandbox por defecto).
 *   TWILIO_SMS_FROM            - emisor SMS, formato "+14155238886".
 *                                Solo necesario si activas el fallback a SMS.
 *   WHATSAPP_PUBLIC_BASE_URL   - URL pública del backend para construir
 *                                la URL absoluta del webhook/status-callback
 *                                que Twilio firma.
 *
 * Referencias:
 *   - Mensajería: https://www.twilio.com/docs/messaging/quickstart/node
 *   - Status callback: https://www.twilio.com/docs/messaging/guides/track-outbound-message-status
 *   - Validación de firma: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */

const crypto = require('node:crypto');
const { normalizarTelefono } = require('../../utils/normalizarTelefono');

function envOrThrow(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`[whatsapp:twilio] Falta variable de entorno ${name}.`);
  }
  return String(v).trim();
}

/** Asegura el prefijo `whatsapp:` que Twilio exige en From/To. */
function toTwilioAddressWhatsapp(raw) {
  const s = String(raw || '').trim();
  if (!s) return s;
  if (/^whatsapp:/i.test(s)) return s;
  const e164 = normalizarTelefono(s);
  return e164 ? `whatsapp:${e164}` : s;
}

/** SMS necesita formato E.164 sin prefijo "whatsapp:". */
function toTwilioAddressSms(raw) {
  const e164 = normalizarTelefono(raw);
  return e164 || String(raw || '').replace(/^whatsapp:/i, '').trim();
}

/** Inverso: devuelve el E.164 sin `whatsapp:` para guardar/lookup en BD. */
function normalizeNumber(raw) {
  return String(raw || '').replace(/^whatsapp:/i, '').trim();
}

/** Devuelve 'whatsapp' | 'sms' a partir del valor crudo de `From` o `To`. */
function detectarCanal(addressRaw) {
  return /^whatsapp:/i.test(String(addressRaw || '')) ? 'whatsapp' : 'sms';
}

async function _postMessages(form) {
  const sid = envOrThrow('TWILIO_ACCOUNT_SID');
  const token = envOrThrow('TWILIO_AUTH_TOKEN');
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* no-op */ }

  if (!resp.ok) {
    const err = new Error(
      `[whatsapp:twilio] HTTP ${resp.status}: ${json?.message || text || 'sin detalle'}`
    );
    err.status = resp.status;
    err.detail = json || text;
    throw err;
  }
  return json;
}

/**
 * Envía un mensaje. Detecta canal según el `to`:
 *   - "whatsapp:+51…" → WhatsApp (acepta mediaUrl)
 *   - "+51…"          → SMS (ignora mediaUrl)
 *
 * Si quieres forzar el canal, pasá `channel: 'sms' | 'whatsapp'`.
 *
 * Opcional: `statusCallback` URL que Twilio hiteará con los status updates
 * (queued, sent, delivered, undelivered, failed, read…).
 */
async function sendMessage({ to, body, mediaUrl, channel, statusCallback }) {
  if (!to) throw new Error('[whatsapp:twilio] sendMessage: "to" es requerido.');
  if (!body && !mediaUrl) {
    throw new Error('[whatsapp:twilio] sendMessage: "body" o "mediaUrl" es requerido.');
  }

  const canal = channel
    ? (channel === 'sms' ? 'sms' : 'whatsapp')
    : detectarCanal(to);

  const form = new URLSearchParams();
  if (canal === 'whatsapp') {
    const from = toTwilioAddressWhatsapp(envOrThrow('TWILIO_WHATSAPP_FROM'));
    form.set('From', from);
    form.set('To', toTwilioAddressWhatsapp(to));
    if (mediaUrl) {
      const urls = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
      for (const u of urls) form.append('MediaUrl', String(u));
    }
  } else {
    const from = toTwilioAddressSms(envOrThrow('TWILIO_SMS_FROM'));
    form.set('From', from);
    form.set('To', toTwilioAddressSms(to));
    // SMS no soporta media — si llega mediaUrl lo ignoramos silenciosamente
    // para que el caller pueda llamar el mismo método sin ramificarse.
  }
  if (body) form.set('Body', String(body));
  if (statusCallback) form.set('StatusCallback', String(statusCallback));

  const json = await _postMessages(form);
  return { sid: json?.sid || '', channel: canal, raw: json };
}

/** Atajo explícito para SMS (equivale a `sendMessage({..., channel: 'sms'})`). */
async function sendSms({ to, body, statusCallback }) {
  return sendMessage({ to, body, channel: 'sms', statusCallback });
}

/**
 * Verifica la firma X-Twilio-Signature de un webhook o status-callback.
 *
 * Algoritmo Twilio:
 *   signature = base64(HMAC-SHA1(authToken, fullUrl + concat(k+v sorted by key)))
 *
 * El path original tal cual lo registró Twilio (con prefijos si los hay)
 * lo tomamos de `req.originalUrl`. La URL absoluta se reconstruye contra
 * `WHATSAPP_PUBLIC_BASE_URL` porque los proxies suelen romper el host real.
 */
function verifyIncomingSignature(req) {
  const headerSig =
    req.headers['x-twilio-signature'] || req.headers['X-Twilio-Signature'];
  if (!headerSig) return false;

  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;

  const base = String(process.env.WHATSAPP_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (!base) {
    console.warn(
      '[whatsapp:twilio] WHATSAPP_PUBLIC_BASE_URL no está seteado, no podemos verificar firma.'
    );
    return false;
  }

  const path = req.originalUrl || req.url || '/api/whatsapp/webhook';
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const body = req.body || {};
  const keys = Object.keys(body).sort();
  let data = url;
  for (const k of keys) data += k + body[k];

  const expected = crypto
    .createHmac('sha1', token)
    .update(Buffer.from(data, 'utf8'))
    .digest('base64');

  const a = Buffer.from(headerSig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseIncomingMessage(req) {
  const body = req.body || {};
  const fromRaw = body.From || body.from || '';
  return {
    from: normalizeNumber(fromRaw),
    canal: detectarCanal(fromRaw), // 'whatsapp' | 'sms'
    body: String(body.Body || body.body || ''),
    numMedia: Number(body.NumMedia || body.numMedia || 0),
    raw: body,
  };
}

/**
 * Parsea un status-callback de Twilio. Los campos relevantes:
 *   MessageSid, MessageStatus (queued|sent|delivered|undelivered|failed|read),
 *   To, From, ErrorCode (numérico), ErrorMessage (texto).
 */
function parseStatusCallback(req) {
  const body = req.body || {};
  const status = String(body.MessageStatus || body.SmsStatus || '').toLowerCase();
  return {
    messageSid: String(body.MessageSid || body.SmsSid || ''),
    status,
    canal: detectarCanal(body.From || body.To || ''),
    to: normalizeNumber(body.To || ''),
    from: normalizeNumber(body.From || ''),
    errorCode: body.ErrorCode ? Number(body.ErrorCode) : null,
    errorMessage: body.ErrorMessage ? String(body.ErrorMessage) : null,
    raw: body,
  };
}

module.exports = {
  sendMessage,
  sendSms,
  verifyIncomingSignature,
  parseIncomingMessage,
  parseStatusCallback,
  normalizeNumber,
  detectarCanal,
  toTwilioAddressWhatsapp,
  toTwilioAddressSms,
};
