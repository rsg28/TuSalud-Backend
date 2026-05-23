'use strict';

/**
 * Provider "null": no envía nada al exterior, solo loguea.
 * Útil en desarrollo y tests para no gastar mensajes en Twilio.
 *
 * Mantiene el mismo contrato que `twilio.js` (sendMessage, sendSms,
 * verifyIncomingSignature, parseIncomingMessage, parseStatusCallback,
 * normalizeNumber, detectarCanal) para que el resto del código no tenga que
 * ramificarse según el provider activo.
 */

const crypto = require('node:crypto');

function fakeSid(prefix = 'NULL') {
  return `${prefix}-${crypto.randomBytes(12).toString('hex')}`;
}

function normalizeNumber(raw) {
  return String(raw || '').replace(/^whatsapp:/i, '').trim();
}

function detectarCanal(addressRaw) {
  return /^whatsapp:/i.test(String(addressRaw || '')) ? 'whatsapp' : 'sms';
}

async function sendMessage({ to, body, mediaUrl, channel, statusCallback }) {
  const canal = channel
    ? (channel === 'sms' ? 'sms' : 'whatsapp')
    : detectarCanal(to);
  console.log(`[whatsapp:null] sendMessage[${canal}]`, {
    to,
    bodyPreview: String(body || '').slice(0, 200),
    mediaUrl: mediaUrl || null,
    statusCallback: statusCallback || null,
  });
  return { sid: fakeSid(canal === 'sms' ? 'NULLSMS' : 'NULLWA'), channel: canal };
}

async function sendSms({ to, body, statusCallback }) {
  return sendMessage({ to, body, channel: 'sms', statusCallback });
}

function verifyIncomingSignature(_req) {
  // En modo null aceptamos cualquier cosa: el webhook no se va a llamar en prod.
  return true;
}

function parseIncomingMessage(req) {
  const body = req.body || {};
  const fromRaw = body.From || body.from || '';
  return {
    from: normalizeNumber(fromRaw),
    canal: detectarCanal(fromRaw),
    body: String(body.Body || body.body || ''),
    numMedia: Number(body.NumMedia || body.numMedia || 0),
  };
}

function parseStatusCallback(req) {
  const body = req.body || {};
  return {
    messageSid: String(body.MessageSid || body.SmsSid || ''),
    status: String(body.MessageStatus || body.SmsStatus || '').toLowerCase(),
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
};
