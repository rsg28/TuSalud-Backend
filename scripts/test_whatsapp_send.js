'use strict';

/**
 * Envía un WhatsApp de prueba SIN adjunto a un número, usando el provider
 * configurado en .env. Útil para descartar problemas con la mediaUrl o con
 * la cotización propiamente dicha.
 *
 * Uso:
 *   node scripts/test_whatsapp_send.js +17783183933 "Hola desde TuSalud"
 *
 * Si el destinatario no está unido al sandbox, Twilio devolverá "sent"
 * pero el mensaje NO llegará al teléfono. En ese caso revisa el log del
 * mensaje en https://console.twilio.com/us1/monitor/logs/sms
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getProvider } = require('../services/whatsapp');
const { normalizarTelefono } = require('../utils/normalizarTelefono');

async function main() {
  const argTel = process.argv[2];
  const argBody = process.argv.slice(3).join(' ') || 'Test TuSalud — ' + new Date().toISOString();

  if (!argTel) {
    console.error('Uso: node scripts/test_whatsapp_send.js <telefono E.164> [texto]');
    console.error('Ej.: node scripts/test_whatsapp_send.js +17783183933 "Hola"');
    process.exit(1);
  }

  const tel = normalizarTelefono(argTel);
  if (!tel) {
    console.error('No se pudo normalizar el teléfono:', argTel);
    process.exit(1);
  }

  console.log('Provider:', String(process.env.WHATSAPP_PROVIDER || 'null'));
  console.log('From:    ', process.env.TWILIO_WHATSAPP_FROM || '(vacío)');
  console.log('To:      ', tel);
  console.log('Body:    ', argBody);
  console.log('');

  const provider = getProvider();
  try {
    const result = await provider.sendMessage({
      to: tel,
      body: argBody,
      channel: 'whatsapp',
    });
    console.log('OK — sid:', result?.sid || '(sin sid)');
    console.log('');
    console.log('IMPORTANTE: "sent" en Twilio NO garantiza entrega.');
    console.log('Si no llega al WhatsApp del destinatario, lo más probable es que');
    console.log(`el número ${tel} no haya enviado "join <código>" al sandbox`);
    console.log('+1 415 523 8886 desde su WhatsApp, o que pasaron >72h del join.');
    console.log('');
    console.log('Mira el log del SID en:');
    console.log('  https://console.twilio.com/us1/monitor/logs/sms');
  } catch (err) {
    console.error('FALLÓ:', err?.message || err);
    console.error('Detalle:', err);
    process.exit(1);
  }
}

main();
