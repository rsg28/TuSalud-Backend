'use strict';

/**
 * Aplicar transición APROBADA / RECHAZADA sobre una cotización desde un canal
 * "externo" (WhatsApp, email, futuras integraciones) sin pasar por el endpoint
 * HTTP `updateEstadoCotizacion`.
 *
 * El endpoint HTTP existente hace verificaciones de rol vía `req.user`, que
 * acá no tienen sentido (la decisión de "puede este teléfono aprobar" la toma
 * el canal antes de llamarnos). Replicamos solo las transiciones de BD
 * (cotizaciones + pedidos + historial) y emitimos notificaciones in-app para
 * que el cliente vea el cambio en su app sin importar por dónde se aprobó.
 *
 * Las verificaciones de seguridad (qué teléfono puede aprobar qué cotización)
 * son responsabilidad del llamador.
 */

const pool = require('../config/database');
const {
  helpers: {
    emitirNotificacionAVendedorDePedido,
  },
} = require('../controllers/notificacionesController');

const ESTADOS_PEDIDO_CERRADOS = new Set([
  'COMPLETADO',
  'CANCELADO',
  'FACTURADO',
]);

/**
 * @param {object} opts
 * @param {number} opts.cotizacionId
 * @param {'APROBADA'|'RECHAZADA'} opts.nuevoEstado
 * @param {string} [opts.motivoRechazo]
 * @param {object} [opts.actor]  Quién ejecutó la transición.
 * @param {string} [opts.actor.canal] - 'WHATSAPP' | 'EMAIL' | …
 * @param {number} [opts.actor.usuarioId]
 * @param {string} [opts.actor.nombre]
 * @returns {Promise<{cotizacion: object, transicionado: boolean, mensaje?: string}>}
 *          `transicionado=false` si la cotización ya estaba en un estado terminal
 *          (idempotencia: aprobar dos veces no rompe nada).
 */
async function aplicarTransicionExterna(opts) {
  const {
    cotizacionId,
    nuevoEstado,
    motivoRechazo = null,
    actor = {},
  } = opts;

  if (nuevoEstado !== 'APROBADA' && nuevoEstado !== 'RECHAZADA') {
    throw new Error(`aplicarTransicionExterna: estado inválido "${nuevoEstado}"`);
  }

  const [existing] = await pool.execute(
    `SELECT id, estado, pedido_id, es_complementaria, creador_tipo, creador_id, numero_cotizacion
       FROM cotizaciones
      WHERE id = ?`,
    [cotizacionId]
  );
  if (existing.length === 0) {
    throw new Error(`Cotización ${cotizacionId} no encontrada`);
  }
  const cot = existing[0];

  // Idempotencia: si ya está APROBADA o RECHAZADA, devolvemos info sin tocar.
  if (cot.estado === 'APROBADA' || cot.estado === 'RECHAZADA') {
    return {
      cotizacion: cot,
      transicionado: false,
      mensaje: `La cotización ya estaba en estado ${cot.estado}.`,
    };
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const esAprobada = nuevoEstado === 'APROBADA';
    await connection.execute(
      `UPDATE cotizaciones
          SET estado = ?,
              mensaje_rechazo = COALESCE(?, mensaje_rechazo),
              fecha_aprobacion = IF(?, NOW(), fecha_aprobacion)
        WHERE id = ?`,
      [
        nuevoEstado,
        nuevoEstado === 'RECHAZADA' && motivoRechazo ? String(motivoRechazo).slice(0, 1000) : null,
        esAprobada,
        cotizacionId,
      ]
    );

    const pedidoId = cot.pedido_id;
    const esComplementaria = !!cot.es_complementaria;

    const [pedEstadoRows] = await connection.execute(
      'SELECT estado, empresa_id FROM pedidos WHERE id = ?',
      [pedidoId]
    );
    const pedidoEstadoActual = pedEstadoRows[0]?.estado ?? null;
    const empresaIdPedido = pedEstadoRows[0]?.empresa_id ?? null;
    const pedidoCerrado = pedidoEstadoActual ? ESTADOS_PEDIDO_CERRADOS.has(pedidoEstadoActual) : false;

    if (!esComplementaria && !pedidoCerrado) {
      if (esAprobada) {
        await connection.execute(
          "UPDATE pedidos SET estado = 'COTIZACION_APROBADA', cotizacion_principal_id = ? WHERE id = ?",
          [cotizacionId, pedidoId]
        );
      } else {
        await connection.execute(
          "UPDATE pedidos SET estado = 'COTIZACION_RECHAZADA' WHERE id = ?",
          [pedidoId]
        );
      }
    }

    const canal = actor.canal || 'EXTERNO';
    const actorNombre = actor.nombre || `Aprobación vía ${canal}`;
    const descripcion = esAprobada
      ? `Aprobada vía ${canal}.`
      : `Rechazada vía ${canal}.${motivoRechazo ? ` Motivo: ${motivoRechazo}` : ''}`;

    await connection.execute(
      `INSERT INTO historial_pedido (
         pedido_id, cotizacion_id, tipo_evento, descripcion,
         usuario_id, usuario_nombre, valor_anterior, valor_nuevo, atendidos, no_atendidos
       )
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
      [
        pedidoId,
        cotizacionId,
        esAprobada ? 'COTIZACION_APROBADA' : 'COTIZACION_RECHAZADA',
        descripcion,
        actor.usuarioId || null,
        actorNombre,
      ]
    );

    await connection.commit();

    // Notificación in-app al cliente creador (best-effort).
    try {
      const numeroCotizacion = cot.numero_cotizacion || `#${cot.id}`;
      const cotEsDelCliente = cot.creador_tipo === 'CLIENTE';
      const clienteCreadorId = cot.creador_id;
      const conn2 = await pool.getConnection();
      try {
        if (cotEsDelCliente && clienteCreadorId) {
          if (esAprobada) {
            await conn2.execute(
              `INSERT INTO notificaciones (tipo, titulo, mensaje, contexto_json, remitente_usuario_id, destinatario_usuario_id, destinatario_empresa_id, leida)
               VALUES ('MENSAJE', ?, ?, ?, ?, ?, ?, 0)`,
              [
                `Tu cotización ${numeroCotizacion} fue aprobada`,
                `El vendedor aceptó tu cotización vía ${canal}. El pedido continúa el flujo normal.`,
                JSON.stringify({
                  evento: 'COTIZACION_CLIENTE_APROBADA_POR_VENDEDOR',
                  cotizacion_id: cot.id,
                  pedido_id: pedidoId,
                  numero_cotizacion: numeroCotizacion,
                  canal,
                }),
                actor.usuarioId || null,
                clienteCreadorId,
                empresaIdPedido,
              ]
            );
          } else {
            await conn2.execute(
              `INSERT INTO notificaciones (tipo, titulo, mensaje, contexto_json, remitente_usuario_id, destinatario_usuario_id, destinatario_empresa_id, leida)
               VALUES ('MENSAJE', ?, ?, ?, ?, ?, ?, 0)`,
              [
                `Tu cotización ${numeroCotizacion} fue rechazada`,
                motivoRechazo
                  ? `Motivo: ${motivoRechazo}`
                  : 'El vendedor rechazó la cotización sin especificar motivo.',
                JSON.stringify({
                  evento: 'COTIZACION_CLIENTE_RECHAZADA_POR_VENDEDOR',
                  cotizacion_id: cot.id,
                  pedido_id: pedidoId,
                  numero_cotizacion: numeroCotizacion,
                  mensaje_rechazo: motivoRechazo || null,
                  canal,
                }),
                actor.usuarioId || null,
                clienteCreadorId,
                empresaIdPedido,
              ]
            );
          }
        } else if (pedidoId) {
          await emitirNotificacionAVendedorDePedido(conn2, {
            pedidoId,
            tipo: 'MENSAJE',
            titulo: esAprobada
              ? `Cotización ${numeroCotizacion} aprobada (${canal})`
              : `Cotización ${numeroCotizacion} rechazada (${canal})`,
            mensaje: esAprobada
              ? 'La cotización fue aprobada externamente.'
              : motivoRechazo
                ? `Motivo: ${motivoRechazo}`
                : 'Rechazada sin motivo.',
            contextoJson: {
              evento: esAprobada ? 'COTIZACION_APROBADA' : 'COTIZACION_RECHAZADA',
              cotizacion_id: cot.id,
              pedido_id: pedidoId,
              numero_cotizacion: numeroCotizacion,
              canal,
            },
            remitenteUsuarioId: actor.usuarioId || null,
          });
        }
      } finally {
        conn2.release();
      }
    } catch (notifErr) {
      console.warn(
        '[cotizacionEstadoCanal] no se pudo emitir notificación:',
        notifErr?.message || notifErr
      );
    }

    const [updated] = await pool.execute('SELECT * FROM cotizaciones WHERE id = ?', [cotizacionId]);
    return { cotizacion: updated[0], transicionado: true };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { aplicarTransicionExterna };
