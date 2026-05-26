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

// =========================================================================
// Provider Meta (WhatsApp Cloud API)
// =========================================================================

test('meta: verifyIncomingSignature acepta firma HMAC-SHA256 válida', () => {
  delete require.cache[require.resolve('../services/whatsapp/meta')];
  const meta = require('../services/whatsapp/meta');
  const crypto = require('node:crypto');

  process.env.WHATSAPP_APP_SECRET = 'unsupersecret';

  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: '123', changes: [] }],
  });
  const sig = 'sha256=' + crypto
    .createHmac('sha256', 'unsupersecret')
    .update(Buffer.from(payload, 'utf8'))
    .digest('hex');

  const req = {
    headers: { 'x-hub-signature-256': sig },
    rawBody: Buffer.from(payload, 'utf8'),
    body: JSON.parse(payload),
  };
  assert.equal(meta.verifyIncomingSignature(req), true);

  // Firma incorrecta:
  const reqBad = { ...req, headers: { 'x-hub-signature-256': 'sha256=' + 'a'.repeat(64) } };
  assert.equal(meta.verifyIncomingSignature(reqBad), false);
});

test('meta: handleVerification responde challenge cuando el token coincide', () => {
  delete require.cache[require.resolve('../services/whatsapp/meta')];
  const meta = require('../services/whatsapp/meta');
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'tk-secret-123';

  const req = {
    query: {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'tk-secret-123',
      'hub.challenge': '999000',
    },
  };
  let status = 0;
  let body = '';
  const res = {
    status(s) { status = s; return this; },
    send(b) { body = b; return this; },
  };
  meta.handleVerification(req, res);
  assert.equal(status, 200);
  assert.equal(body, '999000');

  // Token incorrecto → 403.
  const reqBad = { query: { ...req.query, 'hub.verify_token': 'otro' } };
  meta.handleVerification(reqBad, res);
  assert.equal(status, 403);
});

test('meta: parseEvents extrae mensajes y status updates de un mismo POST', () => {
  delete require.cache[require.resolve('../services/whatsapp/meta')];
  const meta = require('../services/whatsapp/meta');

  // Payload realista de Cloud API con un mensaje entrante + un status update.
  const req = {
    body: {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '14155551234', phone_number_id: 'pnid' },
                contacts: [{ profile: { name: 'Vendedor' }, wa_id: '51987654321' }],
                messages: [
                  {
                    from: '51987654321',
                    id: 'wamid.AAA',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'APROBAR' },
                  },
                ],
              },
            },
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '14155551234', phone_number_id: 'pnid' },
                statuses: [
                  {
                    id: 'wamid.OUT123',
                    status: 'delivered',
                    recipient_id: '51987654321',
                    timestamp: '1700000001',
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };

  const { messages, statuses } = meta.parseEvents(req);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].body, 'APROBAR');
  assert.equal(messages[0].from, '+51987654321');
  assert.equal(messages[0].canal, 'whatsapp');
  assert.equal(messages[0].messageSid, 'wamid.AAA');
  assert.equal(statuses.length, 1);
  assert.equal(statuses[0].status, 'delivered');
  assert.equal(statuses[0].messageSid, 'wamid.OUT123');
  assert.equal(statuses[0].to, '+51987654321');
});

test('meta: parseEvents captura status failed con código de error', () => {
  delete require.cache[require.resolve('../services/whatsapp/meta')];
  const meta = require('../services/whatsapp/meta');
  const req = {
    body: {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'X',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '15551234567' },
            statuses: [{
              id: 'wamid.fail',
              status: 'failed',
              recipient_id: '51987111222',
              errors: [{ code: 131026, title: 'Receiver unavailable', message: 'Phone offline' }],
            }],
          },
        }],
      }],
    },
  };
  const { statuses } = meta.parseEvents(req);
  assert.equal(statuses[0].status, 'failed');
  assert.equal(statuses[0].errorCode, 131026);
  assert.match(statuses[0].errorMessage, /unavailable|offline/i);
});

test('meta: sendMessage construye payload de texto con E.164 sin "+"', async () => {
  delete require.cache[require.resolve('../services/whatsapp/meta')];
  const meta = require('../services/whatsapp/meta');
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'pnid-123';
  process.env.WHATSAPP_ACCESS_TOKEN = 'EAA-fake';

  const originalFetch = global.fetch;
  let capturedUrl = '';
  let capturedBody = null;
  global.fetch = async (url, opts) => {
    capturedUrl = url;
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ messages: [{ id: 'wamid.OK' }] }),
    };
  };
  try {
    const out = await meta.sendMessage({
      to: '987654321', // Perú móvil sin código país
      body: 'Hola',
    });
    assert.equal(out.sid, 'wamid.OK');
    assert.match(capturedUrl, /\/pnid-123\/messages$/);
    assert.equal(capturedBody.messaging_product, 'whatsapp');
    assert.equal(capturedBody.to, '51987654321'); // E.164 sin "+"
    assert.equal(capturedBody.type, 'text');
    assert.equal(capturedBody.text.body, 'Hola');
  } finally {
    global.fetch = originalFetch;
  }
});

test('meta: sendTemplate construye payload con plantilla y parámetros', async () => {
  delete require.cache[require.resolve('../services/whatsapp/meta')];
  const meta = require('../services/whatsapp/meta');
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'pnid-321';
  process.env.WHATSAPP_ACCESS_TOKEN = 'EAA-fake';

  const originalFetch = global.fetch;
  let capturedBody = null;
  global.fetch = async (_url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ messages: [{ id: 'wamid.TPL' }] }),
    };
  };
  try {
    await meta.sendTemplate({
      to: '+17783183933',
      templateName: 'cotizacion_pendiente',
      languageCode: 'es',
      components: [
        { type: 'body', parameters: [
          { type: 'text', text: 'COT-001' },
          { type: 'text', text: 'ACME' },
        ]},
      ],
    });
    assert.equal(capturedBody.type, 'template');
    assert.equal(capturedBody.template.name, 'cotizacion_pendiente');
    assert.equal(capturedBody.template.language.code, 'es');
    assert.equal(capturedBody.to, '17783183933');
    assert.equal(capturedBody.template.components[0].parameters[0].text, 'COT-001');
  } finally {
    global.fetch = originalFetch;
  }
});

test('meta: sendMessage propaga error HTTP con detalle de Meta', async () => {
  delete require.cache[require.resolve('../services/whatsapp/meta')];
  const meta = require('../services/whatsapp/meta');
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'pnid-err';
  process.env.WHATSAPP_ACCESS_TOKEN = 'EAA-bad';

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 400,
    text: async () => JSON.stringify({ error: { message: 'Recipient phone not in allowed list', code: 100 } }),
  });
  try {
    await assert.rejects(
      meta.sendMessage({ to: '+51987654321', body: 'x' }),
      /Recipient phone not in allowed list/i
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('meta: sendSms lanza error (no soporta SMS)', async () => {
  delete require.cache[require.resolve('../services/whatsapp/meta')];
  const meta = require('../services/whatsapp/meta');
  await assert.rejects(meta.sendSms({ to: '+1', body: 'x' }), /no env(í|i)a SMS/i);
});

test('normalizarTelefono: Perú por defecto y Canadá 778', () => {
  const { normalizarTelefono } = require('../utils/normalizarTelefono');
  assert.equal(normalizarTelefono('987654321'), '+51987654321');
  assert.equal(normalizarTelefono('51987654321'), '+51987654321');
  assert.equal(normalizarTelefono('7781234567'), '+17781234567');
  assert.equal(normalizarTelefono('+17781234567'), '+17781234567');
});

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
