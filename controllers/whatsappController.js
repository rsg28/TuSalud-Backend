'use strict';

/**
 * Aprobación/rechazo de cotizaciones vía WhatsApp (con fallback a SMS).
 *
 * Flujo:
 *   1. CLIENTE sube un pedido con cotización (creador_tipo='CLIENTE') →
 *      `dispararEnvioSiCorresponde(cotId)` se llama desde cotizacionesController.
 *   2. Generamos un XLSX, creamos un row en `whatsapp_aprobaciones` con
 *      estado='PENDIENTE' y dos tokens (uno para descargar el archivo, otro
 *      para identificar el status-callback). Pedimos al proveedor que envíe
 *      el mensaje por WhatsApp y le pasamos la URL del status-callback.
 *   3. Twilio nos avisa por `/api/whatsapp/status-callback` cómo le fue al
 *      mensaje. Si llega como `undelivered` o `failed` (típicamente porque
 *      el destinatario no tiene internet o no usa WhatsApp), disparamos
 *      automáticamente un SMS con el mismo contenido en texto plano (sin
 *      adjunto). El SMS también lleva su propio status-callback.
 *   4. El vendedor responde — por WhatsApp o por SMS. Twilio postea al
 *      webhook `/api/whatsapp/webhook`. Detectamos el canal por el `From`
 *      y respondemos en el mismo canal para no obligar al vendedor a saltar
 *      entre apps.
 *   5. Al llegar a APROBADA/RECHAZADA, llamamos a `aplicarTransicionExterna`
 *      (services/cotizacionEstadoCanal.js) que actualiza cotización + pedido
 *      + historial y emite la notif al cliente.
 */

const crypto = require('node:crypto');
const pool = require('../config/database');
const { getProvider } = require('../services/whatsapp');
const { aplicarTransicionExterna } = require('../services/cotizacionEstadoCanal');
const { generarXlsxCotizacion } = require('../utils/generarCotizacionXlsx');

// --------------------------------------------------------------------------
// Mensajes UX
// --------------------------------------------------------------------------

/** Mensaje rico para WhatsApp: con formato markdown y archivo adjunto. */
const MENSAJE_WHATSAPP = (resumen, opciones) => {
  const lineas = [
    '🩺 *Nueva cotización pendiente de aprobación*',
    '',
    `Nº: *${resumen.numero}*`,
    `Empresa: ${resumen.empresa || '—'}`,
    `Pedido: ${resumen.pedidoNumero}`,
    `Ítems: ${resumen.nItems}`,
    `Total: *S/ ${Number(resumen.total || 0).toFixed(2)}*`,
    '',
    'Responde:',
    '✅ *APROBAR*  para aceptarla',
    '❌ *RECHAZAR*  para rechazarla (luego envía el motivo)',
  ];
  if (opciones?.adjuntoMensaje) lineas.push('', opciones.adjuntoMensaje);
  return lineas.join('\n');
};

/**
 * Mensaje compacto para SMS (sin formato, sin adjunto).
 * El SMS se envía cuando WhatsApp no se entrega; el vendedor decide solo
 * con los datos clave + las palabras de respuesta.
 *
 * Mantenemos el cuerpo por debajo de 320 chars (2 segmentos GSM-7) para no
 * encarecer el envío.
 */
const MENSAJE_SMS = (resumen) => {
  const lineas = [
    `TuSalud - Cotizacion ${resumen.numero}`,
    `Empresa: ${resumen.empresa || '-'}`,
    `Pedido: ${resumen.pedidoNumero}`,
    `Items: ${resumen.nItems} | Total: S/ ${Number(resumen.total || 0).toFixed(2)}`,
    '',
    'Responde APROBAR o RECHAZAR (luego envia el motivo).',
  ];
  return lineas.join('\n');
};

const RESPUESTAS = {
  desconocida:
    'No entendí. Responde APROBAR (también vale SI / OK) o RECHAZAR (también NO).',
  sinPendientes:
    'No tienes cotizaciones pendientes en este momento. Si crees que es un error, contacta a soporte.',
  aprobada: (numero) =>
    `✅ Cotización ${numero} APROBADA. Gracias, el pedido continúa el flujo.`,
  pideMotivo: (numero) =>
    `Recibido. Envía ahora el motivo del rechazo de la cotización ${numero} en un solo mensaje.`,
  rechazada: (numero) =>
    `❌ Cotización ${numero} RECHAZADA. Motivo registrado.`,
  yaResuelta: (numero, estado) =>
    `La cotización ${numero} ya estaba ${estado === 'APROBADA' ? 'aprobada' : 'rechazada'}, no se hizo ningún cambio.`,
  errorInterno:
    'Tuvimos un problema procesando tu respuesta. Reintenta en unos segundos o avisa a soporte.',
};

// --------------------------------------------------------------------------
// Parseo de palabras clave (lógica pura, testeable)
// --------------------------------------------------------------------------

const PALABRAS_APROBAR = new Set(['APROBAR', 'APROBAR.', 'APRUEBO', 'SI', 'SÍ', 'OK', 'OKEY', 'OKAY', 'YES']);
const PALABRAS_RECHAZAR = new Set(['RECHAZAR', 'RECHAZAR.', 'RECHAZO', 'NO']);

function normalizarTexto(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/[^\w\sÁÉÍÓÚÑ.]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @returns {'APROBAR'|'RECHAZAR_INICIAR'|'RECHAZAR_CON_MOTIVO'|'DESCONOCIDA'}
 */
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

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function generarToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

function publicBaseUrl() {
  return String(process.env.WHATSAPP_PUBLIC_BASE_URL || '').replace(/\/$/, '');
}

/** URL pública absoluta para que Twilio descargue el XLSX. */
function urlPublicaArchivo(token) {
  const base = publicBaseUrl();
  if (!base) return null;
  return `${base}/api/whatsapp/archivo/${encodeURIComponent(token)}`;
}

/** URL del endpoint que recibirá los status-callbacks de Twilio (incluye token para correlación). */
function urlStatusCallback(token) {
  const base = publicBaseUrl();
  if (!base || !token) return null;
  return `${base}/api/whatsapp/status-callback?token=${encodeURIComponent(token)}`;
}

function smsFallbackHabilitado() {
  // Por defecto, si hay TWILIO_SMS_FROM seteado se considera habilitado.
  // El usuario puede forzar off con WHATSAPP_SMS_FALLBACK_ENABLED=false.
  const flag = String(process.env.WHATSAPP_SMS_FALLBACK_ENABLED || '').toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  return !!String(process.env.TWILIO_SMS_FROM || '').trim();
}

/**
 * @returns {Promise<{telefono: string|null, usuarioId: number|null, rol: string|null}>}
 */
async function resolverDestinatario(cotizacionId) {
  const [rows] = await pool.execute(
    `SELECT p.vendedor_id, u.telefono AS vendedor_telefono
       FROM cotizaciones c
       INNER JOIN pedidos p ON p.id = c.pedido_id
       LEFT JOIN usuarios u ON u.id = p.vendedor_id
      WHERE c.id = ?
      LIMIT 1`,
    [cotizacionId]
  );
  const fila = rows[0] || {};
  if (fila.vendedor_id && fila.vendedor_telefono && String(fila.vendedor_telefono).trim()) {
    return {
      telefono: String(fila.vendedor_telefono).trim(),
      usuarioId: fila.vendedor_id,
      rol: 'vendedor',
    };
  }
  const fallback = String(process.env.WHATSAPP_MANAGER_FALLBACK_PHONE || '').trim();
  if (fallback) {
    return { telefono: fallback, usuarioId: null, rol: 'manager' };
  }
  return { telefono: null, usuarioId: null, rol: null };
}

/** Reúne el resumen de la cotización para construir los mensajes (XLSX y SMS). */
async function obtenerResumenCotizacion(cotizacionId) {
  const xlsx = await generarXlsxCotizacion(cotizacionId);
  return { resumen: xlsx.resumen, buffer: xlsx.buffer, filename: xlsx.filename };
}

// --------------------------------------------------------------------------
// Cache de archivos por token (alternativa simple a S3)
// --------------------------------------------------------------------------

const archivoCache = new Map();

function limpiarArchivosVencidos() {
  const ahora = Date.now();
  for (const [k, v] of archivoCache.entries()) {
    if (v.expiraEn <= ahora) archivoCache.delete(k);
  }
}

// --------------------------------------------------------------------------
// Envío principal (WhatsApp con fallback diferido a SMS)
// --------------------------------------------------------------------------

/**
 * Envía la cotización al vendedor (o manager fallback) por WhatsApp.
 * El fallback a SMS NO se ejecuta aquí: se dispara reactivamente desde
 * `statusCallbackEntrante` cuando Twilio reporta que el WhatsApp falló.
 *
 * Best-effort: errores se loggean y se devuelven en el objeto, nunca
 * propagan al endpoint que subió la cotización.
 */
async function enviarCotizacionAprobacion(cotizacionId) {
  try {
    const destino = await resolverDestinatario(cotizacionId);
    if (!destino.telefono) {
      return {
        ok: false,
        skipped: true,
        reason: 'No hay vendedor con teléfono ni WHATSAPP_MANAGER_FALLBACK_PHONE configurado.',
      };
    }

    const { resumen, buffer, filename } = await obtenerResumenCotizacion(cotizacionId);

    const tokenArchivo = generarToken();
    const tokenStatus = generarToken(16);
    const expiraEn = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const [ins] = await pool.execute(
      `INSERT INTO whatsapp_aprobaciones (
         cotizacion_id, destinatario_telefono, destinatario_usuario_id, destinatario_rol,
         numero_cotizacion, estado, canal_envio,
         token_archivo, token_archivo_expira_en, status_callback_token, enviado_at
       ) VALUES (?, ?, ?, ?, ?, 'PENDIENTE', 'WHATSAPP', ?, ?, ?, NOW())`,
      [
        cotizacionId,
        destino.telefono,
        destino.usuarioId,
        destino.rol,
        resumen.numero,
        tokenArchivo,
        expiraEn,
        tokenStatus,
      ]
    );

    archivoCache.set(tokenArchivo, {
      buffer,
      filename,
      expiraEn: expiraEn.getTime(),
    });

    const provider = getProvider();
    const mediaUrl = urlPublicaArchivo(tokenArchivo);
    const statusCallback = urlStatusCallback(tokenStatus);
    const body = MENSAJE_WHATSAPP(resumen, {
      adjuntoMensaje: mediaUrl ? '📎 Excel adjunto con el detalle.' : null,
    });

    let sid = null;
    try {
      const sendResult = await provider.sendMessage({
        to: destino.telefono,
        body,
        mediaUrl: mediaUrl || undefined,
        channel: 'whatsapp',
        statusCallback: statusCallback || undefined,
      });
      sid = sendResult?.sid || null;
    } catch (sendErr) {
      // Si Twilio devuelve un error HTTP, el envío de WhatsApp ni siquiera
      // partió. Intentamos SMS de inmediato si el fallback está habilitado;
      // si SMS también falla, cancelamos la fila.
      console.warn(
        '[whatsapp] WhatsApp falló al enviar; intentando SMS fallback:',
        sendErr?.message || sendErr
      );
      const fb = await intentarSmsFallback(ins.insertId, {
        motivo: 'whatsapp_no_pudo_enviarse',
        resumen,
        telefono: destino.telefono,
      });
      if (!fb.ok) {
        await pool.execute(
          `UPDATE whatsapp_aprobaciones SET estado = 'CANCELADA' WHERE id = ?`,
          [ins.insertId]
        );
        throw sendErr;
      }
      return { ok: true, pendienteId: ins.insertId, telefono: destino.telefono, sid: null, fallback: fb };
    }

    if (sid) {
      await pool.execute(
        `UPDATE whatsapp_aprobaciones SET mensaje_enviado_sid = ? WHERE id = ?`,
        [sid, ins.insertId]
      );
    }

    return {
      ok: true,
      pendienteId: ins.insertId,
      telefono: destino.telefono,
      sid,
      statusCallback,
    };
  } catch (err) {
    console.error('[whatsapp] enviarCotizacionAprobacion falló:', err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Envía un SMS de respaldo para una fila de `whatsapp_aprobaciones` ya creada
 * (no crea filas nuevas — siempre actualiza la existente). Marca:
 *   - `canal_envio = 'WHATSAPP_THEN_SMS'`
 *   - `sms_enviado_sid` y `sms_enviado_at`
 *
 * Sólo manda SMS si:
 *   - El fallback está habilitado (TWILIO_SMS_FROM seteado y flag != false).
 *   - La fila aún está en PENDIENTE / ESPERANDO_MOTIVO_RECHAZO.
 *   - No se mandó SMS antes para esa misma fila.
 */
async function intentarSmsFallback(pendienteId, { motivo, resumen: resumenIn, telefono: telefonoIn } = {}) {
  try {
    if (!smsFallbackHabilitado()) {
      return { ok: false, skipped: true, reason: 'SMS fallback no habilitado' };
    }

    const [rows] = await pool.execute(
      `SELECT id, cotizacion_id, destinatario_telefono, estado, canal_envio,
              sms_enviado_at, status_callback_token, numero_cotizacion
         FROM whatsapp_aprobaciones
        WHERE id = ?
        LIMIT 1`,
      [pendienteId]
    );
    if (rows.length === 0) {
      return { ok: false, skipped: true, reason: 'fila no encontrada' };
    }
    const fila = rows[0];

    if (fila.sms_enviado_at) {
      return { ok: false, skipped: true, reason: 'SMS ya enviado previamente' };
    }
    if (!['PENDIENTE', 'ESPERANDO_MOTIVO_RECHAZO'].includes(fila.estado)) {
      return { ok: false, skipped: true, reason: `estado=${fila.estado}` };
    }

    const telefono = telefonoIn || fila.destinatario_telefono;
    let resumen = resumenIn;
    if (!resumen) {
      const r = await obtenerResumenCotizacion(fila.cotizacion_id);
      resumen = r.resumen;
    }

    const provider = getProvider();
    const statusCallback = urlStatusCallback(fila.status_callback_token);

    const out = await provider.sendSms({
      to: telefono,
      body: MENSAJE_SMS(resumen),
      statusCallback: statusCallback || undefined,
    });

    await pool.execute(
      `UPDATE whatsapp_aprobaciones
          SET canal_envio = CASE WHEN canal_envio = 'WHATSAPP' THEN 'WHATSAPP_THEN_SMS' ELSE canal_envio END,
              sms_enviado_sid = ?,
              sms_enviado_at = NOW()
        WHERE id = ?`,
      [out?.sid || null, pendienteId]
    );

    console.log(
      `[whatsapp] SMS fallback enviado para fila #${pendienteId} (motivo=${motivo || 'manual'}) sid=${out?.sid || '-'}`
    );
    return { ok: true, sid: out?.sid || null };
  } catch (err) {
    console.error('[whatsapp] intentarSmsFallback falló:', err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

// --------------------------------------------------------------------------
// Endpoints HTTP
// --------------------------------------------------------------------------

/**
 * GET /api/whatsapp/archivo/:token
 * Sirve el XLSX al proveedor. Sin auth (token es la auth). Si el buffer no
 * está en memoria (reinicio), regenera desde BD usando el cotizacion_id
 * asociado al token.
 */
async function descargarArchivoPorToken(req, res) {
  try {
    limpiarArchivosVencidos();
    const { token } = req.params;
    if (!token) return res.status(404).send('Not found');

    let payload = archivoCache.get(token);
    if (!payload) {
      const [rows] = await pool.execute(
        `SELECT cotizacion_id, token_archivo_expira_en
           FROM whatsapp_aprobaciones
          WHERE token_archivo = ?
          LIMIT 1`,
        [token]
      );
      if (rows.length === 0) return res.status(404).send('Not found');
      const expiraEn = rows[0].token_archivo_expira_en
        ? new Date(rows[0].token_archivo_expira_en).getTime()
        : 0;
      if (expiraEn && expiraEn < Date.now()) {
        return res.status(410).send('Gone');
      }
      const xlsx = await generarXlsxCotizacion(rows[0].cotizacion_id);
      payload = {
        buffer: xlsx.buffer,
        filename: xlsx.filename,
        expiraEn: expiraEn || (Date.now() + 60 * 60 * 1000),
      };
      archivoCache.set(token, payload);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${payload.filename}"`
    );
    return res.status(200).end(payload.buffer);
  } catch (err) {
    console.error('[whatsapp] descargarArchivoPorToken falló:', err?.message || err);
    return res.status(500).send('Internal error');
  }
}

/**
 * POST /api/whatsapp/webhook
 * Endpoint público al que el proveedor envía las respuestas del vendedor
 * (por WhatsApp o por SMS). Validamos firma del proveedor, detectamos el
 * canal por el `From` y respondemos en el mismo canal.
 */
async function webhookEntrante(req, res) {
  let canal = 'whatsapp';
  try {
    const provider = getProvider();
    if (!provider.verifyIncomingSignature(req)) {
      console.warn('[whatsapp] webhook con firma inválida — rechazado.');
      return res.status(403).send('Invalid signature');
    }

    const msg = provider.parseIncomingMessage(req);
    canal = msg.canal || 'whatsapp';
    const telefono = msg.from;
    if (!telefono) {
      return res.status(200).send('OK (sin remitente)');
    }

    const [pendientes] = await pool.execute(
      `SELECT id, cotizacion_id, estado, numero_cotizacion,
              destinatario_usuario_id, destinatario_rol
         FROM whatsapp_aprobaciones
        WHERE destinatario_telefono = ?
          AND estado IN ('PENDIENTE', 'ESPERANDO_MOTIVO_RECHAZO')
        ORDER BY created_at DESC
        LIMIT 1`,
      [telefono]
    );

    if (pendientes.length === 0) {
      await provider.sendMessage({ to: telefono, body: RESPUESTAS.sinPendientes, channel: canal });
      return res.status(200).send('OK');
    }

    const conv = pendientes[0];
    const decision = interpretarMensaje(conv.estado, msg.body);
    const canalActor = canal === 'sms' ? 'SMS' : 'WHATSAPP';

    if (decision === 'APROBAR') {
      const resultado = await aplicarTransicionExterna({
        cotizacionId: conv.cotizacion_id,
        nuevoEstado: 'APROBADA',
        actor: {
          canal: canalActor,
          usuarioId: conv.destinatario_usuario_id,
          nombre: `${canalActor} (${conv.destinatario_rol || 'destinatario'})`,
        },
      });
      await pool.execute(
        `UPDATE whatsapp_aprobaciones
            SET estado = 'APROBADA', respondido_at = NOW()
          WHERE id = ?`,
        [conv.id]
      );
      const numero = conv.numero_cotizacion || `#${conv.cotizacion_id}`;
      const cuerpo = resultado.transicionado
        ? RESPUESTAS.aprobada(numero)
        : RESPUESTAS.yaResuelta(numero, resultado.cotizacion?.estado || 'APROBADA');
      await provider.sendMessage({ to: telefono, body: cuerpo, channel: canal });
      return res.status(200).send('OK');
    }

    if (decision === 'RECHAZAR_INICIAR') {
      await pool.execute(
        `UPDATE whatsapp_aprobaciones SET estado = 'ESPERANDO_MOTIVO_RECHAZO' WHERE id = ?`,
        [conv.id]
      );
      const numero = conv.numero_cotizacion || `#${conv.cotizacion_id}`;
      await provider.sendMessage({ to: telefono, body: RESPUESTAS.pideMotivo(numero), channel: canal });
      return res.status(200).send('OK');
    }

    if (decision === 'RECHAZAR_CON_MOTIVO') {
      const motivo = String(msg.body || '').trim().slice(0, 1000);
      const resultado = await aplicarTransicionExterna({
        cotizacionId: conv.cotizacion_id,
        nuevoEstado: 'RECHAZADA',
        motivoRechazo: motivo,
        actor: {
          canal: canalActor,
          usuarioId: conv.destinatario_usuario_id,
          nombre: `${canalActor} (${conv.destinatario_rol || 'destinatario'})`,
        },
      });
      await pool.execute(
        `UPDATE whatsapp_aprobaciones
            SET estado = 'RECHAZADA', motivo_rechazo = ?, respondido_at = NOW()
          WHERE id = ?`,
        [motivo, conv.id]
      );
      const numero = conv.numero_cotizacion || `#${conv.cotizacion_id}`;
      const cuerpo = resultado.transicionado
        ? RESPUESTAS.rechazada(numero)
        : RESPUESTAS.yaResuelta(numero, resultado.cotizacion?.estado || 'RECHAZADA');
      await provider.sendMessage({ to: telefono, body: cuerpo, channel: canal });
      return res.status(200).send('OK');
    }

    await provider.sendMessage({ to: telefono, body: RESPUESTAS.desconocida, channel: canal });
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[whatsapp] webhookEntrante falló:', err?.message || err);
    try {
      const provider = getProvider();
      const msg = provider.parseIncomingMessage(req);
      if (msg.from) {
        await provider.sendMessage({ to: msg.from, body: RESPUESTAS.errorInterno, channel: canal });
      }
    } catch { /* no-op */ }
    return res.status(200).send('OK');
  }
}

/**
 * POST /api/whatsapp/status-callback?token=…
 * Twilio hitea esto con cada cambio de estado del mensaje saliente:
 * queued → sent → delivered/undelivered/failed/read.
 *
 * Cuando vemos `undelivered` o `failed` en un envío WhatsApp, disparamos
 * automáticamente un SMS al mismo número (si el fallback está habilitado).
 */
async function statusCallbackEntrante(req, res) {
  try {
    const provider = getProvider();
    if (!provider.verifyIncomingSignature(req)) {
      console.warn('[whatsapp] status-callback con firma inválida — rechazado.');
      return res.status(403).send('Invalid signature');
    }

    const evento = provider.parseStatusCallback(req);
    const tokenStatus = String(req.query?.token || '').trim();

    // Identificamos la fila por el token (preferido) o por el SID del mensaje.
    let fila = null;
    if (tokenStatus) {
      const [rows] = await pool.execute(
        `SELECT id, cotizacion_id, destinatario_telefono, estado, canal_envio,
                sms_enviado_at, mensaje_enviado_sid, sms_enviado_sid
           FROM whatsapp_aprobaciones
          WHERE status_callback_token = ?
          LIMIT 1`,
        [tokenStatus]
      );
      fila = rows[0] || null;
    }
    if (!fila && evento.messageSid) {
      const [rows] = await pool.execute(
        `SELECT id, cotizacion_id, destinatario_telefono, estado, canal_envio,
                sms_enviado_at, mensaje_enviado_sid, sms_enviado_sid
           FROM whatsapp_aprobaciones
          WHERE mensaje_enviado_sid = ?
             OR sms_enviado_sid = ?
          LIMIT 1`,
        [evento.messageSid, evento.messageSid]
      );
      fila = rows[0] || null;
    }
    if (!fila) {
      // Twilio puede hitear status callbacks de mensajes que no tracking
      // (p. ej. la respuesta de confirmación). No es error: 200 OK.
      return res.status(200).send('OK (sin fila)');
    }

    // Diferenciamos si el status corresponde al envío WhatsApp original o al SMS de respaldo.
    const esCallbackDelSms = evento.messageSid && evento.messageSid === fila.sms_enviado_sid;

    if (!esCallbackDelSms) {
      // Actualizamos el último estado conocido del WhatsApp.
      await pool.execute(
        `UPDATE whatsapp_aprobaciones SET estado_entrega_whatsapp = ? WHERE id = ?`,
        [evento.status, fila.id]
      );

      // Disparar fallback si el WhatsApp no se entregó.
      const fallidos = new Set(['undelivered', 'failed']);
      if (fallidos.has(evento.status) && !fila.sms_enviado_at) {
        const fb = await intentarSmsFallback(fila.id, {
          motivo: `whatsapp_${evento.status}${evento.errorCode ? `_code_${evento.errorCode}` : ''}`,
        });
        if (!fb.ok && !fb.skipped) {
          console.warn('[whatsapp] fallback SMS no se pudo enviar:', fb.error || fb.reason);
        }
      }
    } else {
      // El callback corresponde al SMS de respaldo. Solo lo loggeamos: si
      // el SMS también falla no hay otro canal automático para reintentar.
      console.log(
        `[whatsapp] status SMS fila #${fila.id}: ${evento.status}` +
          (evento.errorCode ? ` (code ${evento.errorCode})` : '')
      );
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[whatsapp] statusCallbackEntrante falló:', err?.message || err);
    // 200 igual: Twilio reintenta si devolvemos error, y la lógica anti-duplicado
    // de `intentarSmsFallback` evita doble SMS, pero preferimos no reintentar.
    return res.status(200).send('OK');
  }
}

/**
 * POST /api/whatsapp/reenviar/:cotizacionId  (auth manager/vendedor)
 * Reenvía la solicitud al vendedor (útil si la conversación quedó CANCELADA
 * o el vendedor no respondió). Cancela pendientes previas para esa cot.
 */
async function reenviarSolicitud(req, res) {
  try {
    const cotizacionId = Number(req.params.cotizacionId);
    if (!Number.isFinite(cotizacionId) || cotizacionId <= 0) {
      return res.status(400).json({ error: 'cotizacionId inválido' });
    }
    await pool.execute(
      `UPDATE whatsapp_aprobaciones
          SET estado = 'CANCELADA'
        WHERE cotizacion_id = ?
          AND estado IN ('PENDIENTE','ESPERANDO_MOTIVO_RECHAZO')`,
      [cotizacionId]
    );
    const out = await enviarCotizacionAprobacion(cotizacionId);
    if (!out.ok) {
      return res.status(out.skipped ? 409 : 500).json(out);
    }
    return res.json({ message: 'Solicitud reenviada', ...out });
  } catch (err) {
    console.error('[whatsapp] reenviarSolicitud falló:', err?.message || err);
    return res.status(500).json({ error: 'Error al reenviar' });
  }
}

/**
 * Hook idempotente llamado desde cotizacionesController. Solo dispara el envío
 * cuando estado='ENVIADA' && creador_tipo='CLIENTE' && no hay pendientes
 * abiertas para esa cotización.
 */
async function dispararEnvioSiCorresponde(cotizacionId) {
  try {
    if (!cotizacionId) return { ok: false, skipped: true, reason: 'sin cotizacionId' };

    const [rows] = await pool.execute(
      `SELECT c.estado, c.creador_tipo,
              (SELECT COUNT(*) FROM whatsapp_aprobaciones w
                WHERE w.cotizacion_id = c.id
                  AND w.estado IN ('PENDIENTE','ESPERANDO_MOTIVO_RECHAZO')
              ) AS pendientes_abiertas
         FROM cotizaciones c
        WHERE c.id = ?`,
      [cotizacionId]
    );
    if (rows.length === 0) {
      return { ok: false, skipped: true, reason: 'cotización no existe' };
    }
    const { estado, creador_tipo: creadorTipo, pendientes_abiertas: pend } = rows[0];

    if (estado !== 'ENVIADA' || creadorTipo !== 'CLIENTE') {
      return { ok: false, skipped: true, reason: `estado=${estado}, creador=${creadorTipo}` };
    }
    if (Number(pend) > 0) {
      return { ok: false, skipped: true, reason: 'ya hay un envío pendiente abierto' };
    }

    return await enviarCotizacionAprobacion(cotizacionId);
  } catch (err) {
    console.error('[whatsapp] dispararEnvioSiCorresponde falló:', err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

module.exports = {
  enviarCotizacionAprobacion,
  intentarSmsFallback,
  dispararEnvioSiCorresponde,
  webhookEntrante,
  statusCallbackEntrante,
  descargarArchivoPorToken,
  reenviarSolicitud,
  _internals: {
    interpretarMensaje,
    normalizarTexto,
    PALABRAS_APROBAR,
    PALABRAS_RECHAZAR,
    smsFallbackHabilitado,
    MENSAJE_SMS,
  },
};
