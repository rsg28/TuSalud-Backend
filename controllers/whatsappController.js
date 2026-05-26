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
const { normalizarTelefono } = require('../utils/normalizarTelefono');

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
      telefono: normalizarTelefono(fila.vendedor_telefono),
      usuarioId: fila.vendedor_id,
      rol: 'vendedor',
    };
  }
  const fallback = normalizarTelefono(process.env.WHATSAPP_MANAGER_FALLBACK_PHONE || '');
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

    /**
     * Selección de método de envío:
     *
     *   - Meta exige que el PRIMER mensaje a un usuario fuera de la ventana
     *     de 24h sea una plantilla aprobada. Si el operador configuró
     *     `WHATSAPP_TEMPLATE_NUEVA_COTIZACION`, enviamos esa plantilla con los
     *     parámetros del resumen.
     *   - Si no hay plantilla configurada (Twilio, sandbox de Meta o usuario
     *     dentro de la ventana de 24h), mandamos texto libre + documento.
     */
    const templateName = String(process.env.WHATSAPP_TEMPLATE_NUEVA_COTIZACION || '').trim();
    const templateLang = String(process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es').trim();

    let sid = null;
    try {
      let sendResult;
      if (templateName && typeof provider.sendTemplate === 'function') {
        sendResult = await provider.sendTemplate({
          to: destino.telefono,
          templateName,
          languageCode: templateLang,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: String(resumen.numero || '-') },
                { type: 'text', text: String(resumen.empresa || '-') },
                { type: 'text', text: String(resumen.pedidoNumero || '-') },
                { type: 'text', text: String(resumen.nItems ?? 0) },
                { type: 'text', text: `S/ ${Number(resumen.total || 0).toFixed(2)}` },
              ],
            },
          ],
        });
      } else {
        sendResult = await provider.sendMessage({
          to: destino.telefono,
          body,
          mediaUrl: mediaUrl || undefined,
          channel: 'whatsapp',
          statusCallback: statusCallback || undefined,
        });
      }
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
 * Procesa un único mensaje entrante. Extraído para que `webhookEntrante`
 * pueda iterar varios (Meta) o uno solo (Twilio) sin duplicar la lógica.
 */
async function _procesarMensajeEntrante(provider, msg) {
  const canal = msg.canal || 'whatsapp';
  const telefono = normalizarTelefono(msg.from);
  if (!telefono) return;

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
    return;
  }

  const conv = pendientes[0];
  const decision = interpretarMensaje(conv.estado, msg.body);
  const canalActor = canal === 'sms' ? 'SMS' : 'WHATSAPP';
  const numero = conv.numero_cotizacion || `#${conv.cotizacion_id}`;

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
    const cuerpo = resultado.transicionado
      ? RESPUESTAS.aprobada(numero)
      : RESPUESTAS.yaResuelta(numero, resultado.cotizacion?.estado || 'APROBADA');
    await provider.sendMessage({ to: telefono, body: cuerpo, channel: canal });
    return;
  }

  if (decision === 'RECHAZAR_INICIAR') {
    await pool.execute(
      `UPDATE whatsapp_aprobaciones SET estado = 'ESPERANDO_MOTIVO_RECHAZO' WHERE id = ?`,
      [conv.id]
    );
    await provider.sendMessage({ to: telefono, body: RESPUESTAS.pideMotivo(numero), channel: canal });
    return;
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
    const cuerpo = resultado.transicionado
      ? RESPUESTAS.rechazada(numero)
      : RESPUESTAS.yaResuelta(numero, resultado.cotizacion?.estado || 'RECHAZADA');
    await provider.sendMessage({ to: telefono, body: cuerpo, channel: canal });
    return;
  }

  await provider.sendMessage({ to: telefono, body: RESPUESTAS.desconocida, channel: canal });
}

/**
 * POST /api/whatsapp/webhook
 * Endpoint público que recibe del proveedor:
 *   - Twilio: un único mensaje (o un único status callback) por POST.
 *   - Meta:   un POST puede traer N mensajes Y N status updates a la vez.
 *
 * Si el provider expone `parseEvents`, lo usamos y procesamos todo. Si no,
 * caemos al camino antiguo (parseIncomingMessage) para no romper Twilio.
 *
 * En todos los casos: verifica firma del proveedor primero y responde 200
 * rápido para evitar reintentos.
 */
async function webhookEntrante(req, res) {
  try {
    const provider = getProvider();
    if (!provider.verifyIncomingSignature(req)) {
      console.warn('[whatsapp] webhook con firma inválida — rechazado.');
      return res.status(403).send('Invalid signature');
    }

    if (typeof provider.parseEvents === 'function') {
      const { messages, statuses } = provider.parseEvents(req);
      for (const m of messages) {
        try { await _procesarMensajeEntrante(provider, m); }
        catch (e) { console.error('[whatsapp] error procesando mensaje:', e?.message || e); }
      }
      for (const s of statuses) {
        try { await _procesarStatusUpdate(s); }
        catch (e) { console.error('[whatsapp] error procesando status:', e?.message || e); }
      }
      return res.status(200).send('OK');
    }

    // Camino legacy (Twilio sin parseEvents): un único mensaje por webhook.
    const msg = provider.parseIncomingMessage(req);
    await _procesarMensajeEntrante(provider, msg);
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[whatsapp] webhookEntrante falló:', err?.message || err);
    return res.status(200).send('OK');
  }
}

/**
 * Procesa UN status update (compartido entre el endpoint dedicado de Twilio
 * y el webhook unificado de Meta).
 *
 * Si encuentra la fila y el WhatsApp falló (undelivered/failed), dispara el
 * fallback a SMS — solo cuando el proveedor SMS está configurado. Para Meta
 * sin Twilio el fallback queda en `skipped` y se loggea.
 */
async function _procesarStatusUpdate(evento, opts = {}) {
  const tokenStatus = String(opts.tokenStatus || '').trim();

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
  if (!fila) return { ok: true, skipped: true, reason: 'sin fila' };

  const esCallbackDelSms = evento.messageSid && evento.messageSid === fila.sms_enviado_sid;

  if (esCallbackDelSms) {
    console.log(
      `[whatsapp] status SMS fila #${fila.id}: ${evento.status}` +
        (evento.errorCode ? ` (code ${evento.errorCode})` : '')
    );
    return { ok: true };
  }

  await pool.execute(
    `UPDATE whatsapp_aprobaciones SET estado_entrega_whatsapp = ? WHERE id = ?`,
    [evento.status, fila.id]
  );

  const fallidos = new Set(['undelivered', 'failed']);
  if (fallidos.has(evento.status) && !fila.sms_enviado_at) {
    const fb = await intentarSmsFallback(fila.id, {
      motivo: `whatsapp_${evento.status}${evento.errorCode ? `_code_${evento.errorCode}` : ''}`,
    });
    if (!fb.ok && !fb.skipped) {
      console.warn('[whatsapp] fallback SMS no se pudo enviar:', fb.error || fb.reason);
    }
  }
  return { ok: true };
}

/**
 * POST /api/whatsapp/status-callback?token=…
 * Endpoint dedicado de Twilio para status updates (Meta no lo usa: sus status
 * vienen por el webhook principal y se procesan en `webhookEntrante`).
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
    await _procesarStatusUpdate(evento, { tokenStatus });
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[whatsapp] statusCallbackEntrante falló:', err?.message || err);
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

/**
 * Enmascara un teléfono para mostrarlo en UI sin exponer el número completo.
 * Ej. "+51987654321" → "+51 *** *** 321".
 *
 * No es seguridad real (el número completo igual viaja en BD y logs), es solo
 * cortesía visual para que un screenshot del frontend no exponga el dato.
 */
function enmascararTelefono(telefono) {
  const limpio = String(telefono || '').trim();
  if (!limpio) return '';
  if (limpio.length <= 4) return limpio;
  const visible = limpio.slice(-3);
  const prefijo = limpio.startsWith('+') ? limpio.slice(0, 3) : '';
  return `${prefijo} *** *** ${visible}`.trim();
}

/**
 * GET /api/whatsapp/aprobaciones/cotizacion/:cotizacionId  (auth)
 *
 * Devuelve el historial de envíos WhatsApp/SMS asociados a una cotización
 * para que el frontend pueda mostrar el estado actual (canal, último status
 * del provider, fechas, motivo de rechazo) y habilitar el botón "Reenviar".
 *
 * Respuesta:
 * {
 *   cotizacionId: number,
 *   total: number,
 *   activo: <fila actual o null>,
 *   historial: [<filas previas, más reciente primero>]
 * }
 *
 * Para roles manager/vendedor devolvemos el teléfono completo (lo necesitan
 * para hacer follow-up); para el resto solo el enmascarado.
 */
async function obtenerEstadoAprobacion(req, res) {
  try {
    const cotizacionId = Number(req.params.cotizacionId);
    if (!Number.isFinite(cotizacionId) || cotizacionId <= 0) {
      return res.status(400).json({ error: 'cotizacionId inválido' });
    }

    const [rows] = await pool.execute(
      `SELECT id, cotizacion_id, destinatario_telefono, destinatario_rol,
              destinatario_usuario_id, numero_cotizacion, estado, canal_envio,
              motivo_rechazo, mensaje_enviado_sid, estado_entrega_whatsapp,
              sms_enviado_sid, sms_enviado_at, enviado_at, respondido_at,
              created_at, updated_at
         FROM whatsapp_aprobaciones
        WHERE cotizacion_id = ?
        ORDER BY id DESC`,
      [cotizacionId]
    );

    const rolUsuario = String(req.user?.rol || '').toLowerCase();
    const puedeVerTelefono = rolUsuario === 'manager' || rolUsuario === 'vendedor';

    const mapeada = rows.map((r) => ({
      id: r.id,
      cotizacion_id: r.cotizacion_id,
      numero_cotizacion: r.numero_cotizacion,
      destinatario_rol: r.destinatario_rol,
      destinatario_usuario_id: r.destinatario_usuario_id,
      destinatario_telefono_enmascarado: enmascararTelefono(r.destinatario_telefono),
      destinatario_telefono: puedeVerTelefono ? r.destinatario_telefono : null,
      estado: r.estado,
      canal_envio: r.canal_envio,
      estado_entrega_whatsapp: r.estado_entrega_whatsapp,
      motivo_rechazo: r.motivo_rechazo,
      mensaje_enviado_sid: r.mensaje_enviado_sid,
      sms_enviado_sid: r.sms_enviado_sid,
      sms_enviado_at: r.sms_enviado_at,
      enviado_at: r.enviado_at,
      respondido_at: r.respondido_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    const activo =
      mapeada.find(
        (r) =>
          r.estado === 'PENDIENTE' || r.estado === 'ESPERANDO_MOTIVO_RECHAZO'
      ) || mapeada[0] || null;

    return res.json({
      cotizacionId,
      total: mapeada.length,
      activo,
      historial: mapeada,
    });
  } catch (err) {
    console.error(
      '[whatsapp] obtenerEstadoAprobacion falló:',
      err?.message || err
    );
    return res
      .status(500)
      .json({ error: 'Error al consultar estado de WhatsApp' });
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
  obtenerEstadoAprobacion,
  _internals: {
    interpretarMensaje,
    normalizarTexto,
    PALABRAS_APROBAR,
    PALABRAS_RECHAZAR,
    smsFallbackHabilitado,
    MENSAJE_SMS,
    enmascararTelefono,
  },
};
