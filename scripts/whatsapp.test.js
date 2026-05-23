'use strict';

/**
 * Tests unitarios para la integración WhatsApp.
 * Cubren la lógica PURA del controller (parseo de palabras clave) y la
 * verificación de firma Twilio, sin tocar BD ni red.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Evitamos importar el controller completo (require carga `pool` y servicios)
// porque el test corre sin BD. Recortamos el parseador (debe quedar EXACTAMENTE
// como en whatsappController.js — si lo cambias allá, cambialo acá también).
const PALABRAS_APROBAR = new Set([
  'APROBAR', 'APROBAR.', 'APRUEBO', 'SI', 'SÍ', 'OK', 'OKEY', 'OKAY', 'YES',
]);
const PALABRAS_RECHAZAR = new Set([
  'RECHAZAR', 'RECHAZAR.', 'RECHAZO', 'NO',
]);

function normalizarTexto(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/[^\w\sÁÉÍÓÚÑ.]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function interpretarMensaje(estadoConversacion, textoCrudo) {
  const texto = normalizarTexto(textoCrudo);
  if (estadoConversacion === 'ESPERANDO_MOTIVO_RECHAZO') {
    if (texto.length === 0) return 'DESCONOCIDA';
    return 'RECHAZAR_CON_MOTIVO';
  }
  if (!texto) return 'DESCONOCIDA';
  const primera = texto.split(' ')[0];
  if (PALABRAS_APROBAR.has(primera)) return 'APROBAR';
  if (PALABRAS_RECHAZAR.has(primera)) return 'RECHAZAR_INICIAR';
  return 'DESCONOCIDA';
}

test('interpretarMensaje: APROBAR / SI / OK desde estado PENDIENTE', () => {
  for (const t of ['APROBAR', 'aprobar', '  APROBAR  ', 'SI', 'sí', 'Ok', 'YES', 'APROBAR por favor']) {
    assert.equal(interpretarMensaje('PENDIENTE', t), 'APROBAR', `falló: "${t}"`);
  }
});

test('interpretarMensaje: RECHAZAR desde PENDIENTE pide motivo', () => {
  for (const t of ['RECHAZAR', 'no', 'NO', 'Rechazo']) {
    assert.equal(interpretarMensaje('PENDIENTE', t), 'RECHAZAR_INICIAR', `falló: "${t}"`);
  }
});

test('interpretarMensaje: mensaje libre desde ESPERANDO_MOTIVO_RECHAZO se trata como motivo', () => {
  const motivos = [
    'El precio es muy alto',
    'Falta el examen X',
    'sí no me convence',
    'Cualquier texto vale',
  ];
  for (const m of motivos) {
    assert.equal(interpretarMensaje('ESPERANDO_MOTIVO_RECHAZO', m), 'RECHAZAR_CON_MOTIVO', `falló: "${m}"`);
  }
});

test('interpretarMensaje: mensaje vacío en ESPERANDO_MOTIVO_RECHAZO se considera desconocido (no rechaza por vacío)', () => {
  assert.equal(interpretarMensaje('ESPERANDO_MOTIVO_RECHAZO', '   '), 'DESCONOCIDA');
  assert.equal(interpretarMensaje('ESPERANDO_MOTIVO_RECHAZO', ''), 'DESCONOCIDA');
});

test('interpretarMensaje: texto random en PENDIENTE → DESCONOCIDA', () => {
  for (const t of ['hola', 'qué tal', '🤔', '12345', 'aprueb', 'rech']) {
    assert.equal(interpretarMensaje('PENDIENTE', t), 'DESCONOCIDA', `falló: "${t}"`);
  }
});

test('normalizarTexto: limpia emojis y conserva primera palabra', () => {
  assert.equal(normalizarTexto('✅ APROBAR'), 'APROBAR');
  assert.equal(normalizarTexto('  ok  '), 'OK');
  assert.equal(normalizarTexto('rechazar 😠'), 'RECHAZAR');
});

// -------- Verificación de firma Twilio (reproducción del algoritmo) ---------

test('verifyIncomingSignature: HMAC-SHA1 (url + concat de pares ordenados) coincide', () => {
  const token = 'fake-auth-token';
  const url = 'https://api.tusalud.test/api/whatsapp/webhook';
  const params = {
    From: 'whatsapp:+51999999999',
    Body: 'APROBAR',
    To: 'whatsapp:+14155238886',
    NumMedia: '0',
  };
  // Construye la firma como espera Twilio.
  const keys = Object.keys(params).sort();
  let data = url;
  for (const k of keys) data += k + params[k];
  const expected = crypto.createHmac('sha1', token).update(data).digest('base64');

  // Replicamos manualmente la verificación que hace twilio.js.
  process.env.TWILIO_AUTH_TOKEN = token;
  process.env.WHATSAPP_PUBLIC_BASE_URL = 'https://api.tusalud.test';
  // Limpiamos cache del módulo para que tome los env nuevos.
  delete require.cache[require.resolve('../services/whatsapp/twilio')];
  const provider = require('../services/whatsapp/twilio');

  const req = {
    headers: { 'x-twilio-signature': expected },
    originalUrl: '/api/whatsapp/webhook',
    body: params,
  };
  assert.equal(provider.verifyIncomingSignature(req), true);

  // Una firma distinta debería fallar.
  req.headers['x-twilio-signature'] = crypto.randomBytes(20).toString('base64');
  assert.equal(provider.verifyIncomingSignature(req), false);
});

test('verifyIncomingSignature: sin WHATSAPP_PUBLIC_BASE_URL no podemos validar', () => {
  delete process.env.WHATSAPP_PUBLIC_BASE_URL;
  delete require.cache[require.resolve('../services/whatsapp/twilio')];
  const provider = require('../services/whatsapp/twilio');
  const req = {
    headers: { 'x-twilio-signature': 'cualquier-firma' },
    originalUrl: '/api/whatsapp/webhook',
    body: { From: 'x' },
  };
  assert.equal(provider.verifyIncomingSignature(req), false);
});

// -------- Provider null: no rompe nada -------------------------------------

test('provider null: sendMessage devuelve sid sintético con prefijo por canal', async () => {
  const nullProvider = require('../services/whatsapp/null');
  // Sin prefijo whatsapp: → canal SMS
  const sms = await nullProvider.sendMessage({ to: '+51999', body: 'hola' });
  assert.ok(sms && typeof sms.sid === 'string' && sms.sid.startsWith('NULLSMS-'));
  assert.equal(sms.channel, 'sms');
  // Con prefijo → WhatsApp
  const wa = await nullProvider.sendMessage({ to: 'whatsapp:+51999', body: 'hola' });
  assert.ok(wa && typeof wa.sid === 'string' && wa.sid.startsWith('NULLWA-'));
  assert.equal(wa.channel, 'whatsapp');
  // sendSms fuerza canal SMS aunque venga el to con prefijo whatsapp:
  const sms2 = await nullProvider.sendSms({ to: 'whatsapp:+51999', body: 'hola' });
  assert.equal(sms2.channel, 'sms');
  // verifyIncomingSignature: en provider null acepta cualquier cosa.
  assert.equal(nullProvider.verifyIncomingSignature({}), true);
});

test('provider null: parseIncomingMessage normaliza el prefijo whatsapp:', () => {
  const nullProvider = require('../services/whatsapp/null');
  const parsed = nullProvider.parseIncomingMessage({
    body: { From: 'whatsapp:+51999999999', Body: 'aprobar', NumMedia: '0' },
  });
  assert.equal(parsed.from, '+51999999999');
  assert.equal(parsed.canal, 'whatsapp');
  assert.equal(parsed.body, 'aprobar');
  assert.equal(parsed.numMedia, 0);
});

// -------- Detección de canal entrante (WhatsApp vs SMS) --------------------

test('detectarCanal: distingue WhatsApp y SMS por el prefijo del From', () => {
  delete require.cache[require.resolve('../services/whatsapp/twilio')];
  const provider = require('../services/whatsapp/twilio');
  assert.equal(provider.detectarCanal('whatsapp:+51999999999'), 'whatsapp');
  assert.equal(provider.detectarCanal('+51999999999'), 'sms');
  assert.equal(provider.detectarCanal('WHATSAPP:+51999999999'), 'whatsapp');
  assert.equal(provider.detectarCanal(''), 'sms');
});

test('parseIncomingMessage de Twilio: incluye canal en la salida', () => {
  delete require.cache[require.resolve('../services/whatsapp/twilio')];
  const provider = require('../services/whatsapp/twilio');
  const wa = provider.parseIncomingMessage({
    body: { From: 'whatsapp:+51999999999', Body: 'APROBAR' },
  });
  const sms = provider.parseIncomingMessage({
    body: { From: '+51999999999', Body: 'APROBAR' },
  });
  assert.equal(wa.canal, 'whatsapp');
  assert.equal(wa.from, '+51999999999');
  assert.equal(sms.canal, 'sms');
  assert.equal(sms.from, '+51999999999');
});

// -------- Status callback ---------------------------------------------------

test('parseStatusCallback de Twilio: extrae MessageStatus, MessageSid y ErrorCode', () => {
  delete require.cache[require.resolve('../services/whatsapp/twilio')];
  const provider = require('../services/whatsapp/twilio');
  const evt = provider.parseStatusCallback({
    body: {
      MessageSid: 'SMxxxxx',
      MessageStatus: 'undelivered',
      To: 'whatsapp:+51999999999',
      From: 'whatsapp:+14155238886',
      ErrorCode: '63016',
      ErrorMessage: 'Failed to send because device is unreachable',
    },
  });
  assert.equal(evt.messageSid, 'SMxxxxx');
  assert.equal(evt.status, 'undelivered');
  assert.equal(evt.canal, 'whatsapp');
  assert.equal(evt.to, '+51999999999');
  assert.equal(evt.errorCode, 63016);
});

// -------- Lógica del fallback (función pura) -------------------------------

/**
 * Reproducimos la condición de "disparar fallback" tal cual está en el
 * controller. Si cambias la lista de estados, actualiza ambos lugares.
 */
function deberiaDispararFallback({ status, smsYaEnviado, estadoFila }) {
  if (smsYaEnviado) return false;
  if (!['PENDIENTE', 'ESPERANDO_MOTIVO_RECHAZO'].includes(estadoFila)) return false;
  return ['undelivered', 'failed'].includes(status);
}

test('fallback: dispara cuando status es undelivered o failed y no se mandó SMS', () => {
  assert.equal(
    deberiaDispararFallback({ status: 'undelivered', smsYaEnviado: false, estadoFila: 'PENDIENTE' }),
    true
  );
  assert.equal(
    deberiaDispararFallback({ status: 'failed', smsYaEnviado: false, estadoFila: 'PENDIENTE' }),
    true
  );
});

test('fallback: NO dispara si el SMS ya se mandó antes', () => {
  assert.equal(
    deberiaDispararFallback({ status: 'undelivered', smsYaEnviado: true, estadoFila: 'PENDIENTE' }),
    false
  );
});

test('fallback: NO dispara si la fila ya está APROBADA/RECHAZADA/CANCELADA', () => {
  for (const estado of ['APROBADA', 'RECHAZADA', 'CANCELADA']) {
    assert.equal(
      deberiaDispararFallback({ status: 'undelivered', smsYaEnviado: false, estadoFila: estado }),
      false,
      `estado=${estado}`
    );
  }
});

test('fallback: NO dispara para status delivered/sent/read', () => {
  for (const s of ['delivered', 'sent', 'queued', 'read']) {
    assert.equal(
      deberiaDispararFallback({ status: s, smsYaEnviado: false, estadoFila: 'PENDIENTE' }),
      false,
      `status=${s}`
    );
  }
});

// -------- Configuración del fallback --------------------------------------

test('smsFallbackHabilitado: requiere TWILIO_SMS_FROM y flag != false', () => {
  // Forzamos environmente limpio.
  delete require.cache[require.resolve('../controllers/whatsappController')];
  const original = {
    sms: process.env.TWILIO_SMS_FROM,
    flag: process.env.WHATSAPP_SMS_FALLBACK_ENABLED,
  };

  process.env.TWILIO_SMS_FROM = '';
  process.env.WHATSAPP_SMS_FALLBACK_ENABLED = 'true';
  // El controller requiere `pool` (BD); intentamos cargarlo pero si falla por
  // BD usamos eval directo de la función exportada.
  try {
    const ctrl = require('../controllers/whatsappController');
    assert.equal(ctrl._internals.smsFallbackHabilitado(), false, 'sin TWILIO_SMS_FROM');
    process.env.TWILIO_SMS_FROM = '+14155551111';
    assert.equal(ctrl._internals.smsFallbackHabilitado(), true, 'con SMS_FROM y flag default');
    process.env.WHATSAPP_SMS_FALLBACK_ENABLED = 'false';
    assert.equal(ctrl._internals.smsFallbackHabilitado(), false, 'flag=false fuerza off');
  } finally {
    process.env.TWILIO_SMS_FROM = original.sms || '';
    process.env.WHATSAPP_SMS_FALLBACK_ENABLED = original.flag || '';
  }
});

// -------- Cuerpo del SMS (debe quedar compacto, sin emojis raros) ----------

test('MENSAJE_SMS: incluye datos clave y cabe en ~2 segmentos GSM-7', () => {
  delete require.cache[require.resolve('../controllers/whatsappController')];
  const ctrl = require('../controllers/whatsappController');
  const resumen = {
    numero: 'COT-000123',
    empresa: 'ACME S.A.',
    pedidoNumero: 'PED-00045',
    nItems: 12,
    total: 1500.5,
  };
  const body = ctrl._internals.MENSAJE_SMS(resumen);
  assert.match(body, /COT-000123/);
  assert.match(body, /ACME S\.A\./);
  assert.match(body, /Total: S\/ 1500\.50/);
  assert.match(body, /APROBAR/);
  assert.match(body, /RECHAZAR/);
  // GSM-7: ~160 chars por segmento. 2 segmentos = 306 chars (concatenado).
  assert.ok(body.length < 320, `SMS demasiado largo: ${body.length} chars`);
});
