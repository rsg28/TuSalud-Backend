'use strict';

/**
 * Test end-to-end del flujo de palabras clave APROBAR / RECHAZAR de
 * cotizaciones por WhatsApp.
 *
 * Lo que hace:
 *   1. Identifica la última cotización en estado `whatsapp_aprobaciones.estado`
 *      = 'PENDIENTE' (o la que pases por argumento). Si no hay, sale con error
 *      claro indicándole al usuario que primero dispare un envío.
 *   2. Simula un mensaje entrante del destinatario llamando directamente al
 *      controller (`_procesarMensajeEntrante`). Esto evita tener que falsificar
 *      la firma HMAC del provider — útil cuando estás en sandbox de Twilio
 *      donde solo TU número puede generar webhooks reales.
 *   3. Imprime el estado ANTES y DESPUÉS de `whatsapp_aprobaciones` y de
 *      `cotizaciones` para que veas las transiciones.
 *
 * Limitaciones:
 *   - El provider real (Twilio sandbox o Meta) recibirá la llamada `sendMessage`
 *     que el controller hace para responder al destinatario. Si el provider es
 *     `null` no pasa nada, si es `twilio` se manda un WhatsApp REAL al
 *     destinatario. Esto es deseable: validás el feedback end-to-end.
 *   - No simula la firma del webhook. Para una prueba con firma real, usa
 *     scripts/whatsapp_palabras_clave_webhook.js (no existe todavía).
 *
 * Uso:
 *   node scripts/whatsapp_palabras_clave_e2e.js              # toma la última PENDIENTE
 *   node scripts/whatsapp_palabras_clave_e2e.js --cot 42     # cotización id=42
 *   node scripts/whatsapp_palabras_clave_e2e.js --accion APROBAR
 *   node scripts/whatsapp_palabras_clave_e2e.js --accion RECHAZAR
 *   node scripts/whatsapp_palabras_clave_e2e.js --accion MOTIVO --motivo "Precio muy alto"
 *
 * Si no pasás --accion, por defecto manda APROBAR.
 */

require('dotenv').config();

const pool = require('../config/database');
const whatsappController = require('../controllers/whatsappController');
const { getProvider } = require('../services/whatsapp');

function leerArgs() {
  const args = process.argv.slice(2);
  const out = { cotizacionId: null, accion: 'APROBAR', motivo: null };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--cot' || a === '--cotizacion' || a === '--cot-id') {
      out.cotizacionId = Number(args[++i]);
    } else if (a === '--accion' || a === '--action') {
      out.accion = String(args[++i] || '').toUpperCase();
    } else if (a === '--motivo' || a === '--reason') {
      out.motivo = String(args[++i] || '');
    }
  }
  if (!['APROBAR', 'RECHAZAR', 'MOTIVO'].includes(out.accion)) {
    throw new Error(
      `--accion inválida: ${out.accion}. Valores válidos: APROBAR, RECHAZAR, MOTIVO`
    );
  }
  return out;
}

function bodyParaAccion(accion, motivo) {
  switch (accion) {
    case 'APROBAR':
      return 'APROBAR';
    case 'RECHAZAR':
      return 'RECHAZAR';
    case 'MOTIVO':
      return motivo || 'Motivo de prueba enviado por script E2E';
    default:
      return 'APROBAR';
  }
}

async function snapshotConversacion(conversacionId) {
  const [r] = await pool.execute(
    `SELECT id, cotizacion_id, destinatario_telefono, destinatario_rol, estado,
            canal_envio, motivo_rechazo, estado_entrega_whatsapp,
            enviado_at, respondido_at, created_at, updated_at
       FROM whatsapp_aprobaciones
      WHERE id = ?`,
    [conversacionId]
  );
  return r[0] || null;
}

async function snapshotCotizacion(cotizacionId) {
  const [r] = await pool.execute(
    `SELECT id, numero_cotizacion, estado, creador_tipo, mensaje_rechazo,
            fecha_aprobacion, updated_at
       FROM cotizaciones
      WHERE id = ?`,
    [cotizacionId]
  );
  return r[0] || null;
}

(async function main() {
  let exitCode = 0;
  try {
    const { cotizacionId, accion, motivo } = leerArgs();

    // 1) Resolver la fila pendiente de whatsapp_aprobaciones a operar.
    let pendiente;
    if (cotizacionId) {
      const [r] = await pool.execute(
        `SELECT * FROM whatsapp_aprobaciones
          WHERE cotizacion_id = ?
            AND estado IN ('PENDIENTE','ESPERANDO_MOTIVO_RECHAZO')
          ORDER BY id DESC LIMIT 1`,
        [cotizacionId]
      );
      pendiente = r[0];
      if (!pendiente) {
        throw new Error(
          `No encontré conversación abierta (PENDIENTE/ESPERANDO_MOTIVO_RECHAZO) ` +
          `para cotización ${cotizacionId}. ¿Ya respondió? ¿Se canceló?`
        );
      }
    } else {
      const [r] = await pool.execute(
        `SELECT * FROM whatsapp_aprobaciones
          WHERE estado IN ('PENDIENTE','ESPERANDO_MOTIVO_RECHAZO')
          ORDER BY id DESC LIMIT 1`
      );
      pendiente = r[0];
      if (!pendiente) {
        throw new Error(
          'No hay ninguna conversación abierta. Dispará primero un envío:\n' +
          '  - Como cliente, sube una cotización para que entre en estado ENVIADA + CLIENTE.\n' +
          '  - O fuerza un reenvío: POST /api/whatsapp/reenviar/<cotizacionId>.\n' +
          '  - O usa el script de envío forzado.'
        );
      }
    }

    const cotIdResuelta = pendiente.cotizacion_id;
    const telefonoOrigen = pendiente.destinatario_telefono;

    console.log('━'.repeat(60));
    console.log(`COT ID:        ${cotIdResuelta}`);
    console.log(`Conv ID:       ${pendiente.id}`);
    console.log(`Tel destino:   ${telefonoOrigen}`);
    console.log(`Estado actual: ${pendiente.estado}`);
    console.log(`Acción:        ${accion}`);
    if (accion === 'MOTIVO') {
      console.log(`Motivo:        "${motivo || '(default)'}"`);
    }
    console.log('━'.repeat(60));

    // 2) Snapshot ANTES.
    const convAntes = await snapshotConversacion(pendiente.id);
    const cotAntes = await snapshotCotizacion(cotIdResuelta);
    console.log('\n— ANTES —');
    console.log('whatsapp_aprobaciones.estado:', convAntes.estado);
    console.log('cotizaciones.estado:        ', cotAntes.estado);
    console.log('cotizaciones.mensaje_rechazo:', cotAntes.mensaje_rechazo || '(null)');

    // 3) Simular el mensaje entrante. Llamamos directo a `_procesarMensajeEntrante`
    //    para saltarnos la verificación de firma del provider.
    const provider = getProvider();
    const mensajeSimulado = {
      from: telefonoOrigen,
      canal: 'whatsapp',
      body: bodyParaAccion(accion, motivo),
    };

    console.log(`\n→ Simulando mensaje entrante: "${mensajeSimulado.body}"`);
    await whatsappController._internals.procesarMensajeEntrante(provider, mensajeSimulado);

    // 4) Snapshot DESPUÉS.
    const convDespues = await snapshotConversacion(pendiente.id);
    const cotDespues = await snapshotCotizacion(cotIdResuelta);
    console.log('\n— DESPUÉS —');
    console.log('whatsapp_aprobaciones.estado:', convDespues.estado);
    console.log('cotizaciones.estado:        ', cotDespues.estado);
    console.log('cotizaciones.mensaje_rechazo:', cotDespues.mensaje_rechazo || '(null)');
    if (convDespues.respondido_at) {
      console.log('Respondido el:              ', convDespues.respondido_at);
    }

    console.log('\n━'.repeat(60));

    // 5) Veredicto.
    const expectado = {
      APROBAR: { conv: 'APROBADA', cot: 'APROBADA' },
      RECHAZAR: { conv: 'ESPERANDO_MOTIVO_RECHAZO', cot: null /* no cambia aún */ },
      MOTIVO: { conv: 'RECHAZADA', cot: 'RECHAZADA' },
    }[accion];

    const okConv = convDespues.estado === expectado.conv;
    const okCot = expectado.cot ? cotDespues.estado === expectado.cot : true;

    if (okConv && okCot) {
      console.log('✅ Flujo OK — la BD reflejó la respuesta correctamente.');
    } else {
      console.log('⚠️  Transición inesperada.');
      console.log(`   esperado conv=${expectado.conv}, cot=${expectado.cot || '(sin cambio)'}`);
      console.log(`   actual   conv=${convDespues.estado}, cot=${cotDespues.estado}`);
      exitCode = 1;
    }
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.stack && process.env.DEBUG) console.error(err.stack);
    exitCode = 2;
  } finally {
    try {
      await pool.end();
    } catch {
      /* noop */
    }
    process.exit(exitCode);
  }
})();
