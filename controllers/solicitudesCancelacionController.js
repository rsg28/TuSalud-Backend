/**
 * Controller para `solicitudes_cancelacion`.
 *
 * Flujo:
 *   - El CLIENTE crea una solicitud con un mensaje opcional para el vendedor.
 *   - El VENDEDOR/MANAGER ve la solicitud y la APRUEBA (ejecuta la cancelación
 *     del pedido, que es destructiva) o la RECHAZA (con mensaje explicando el
 *     motivo).
 *   - Solo puede existir una solicitud PENDIENTE por pedido en simultáneo
 *     (índice único parcial sobre la generated column `pendiente_lock`).
 */
const pool = require('../config/database');
const { cancelarPedidoEnConnection } = require('./pedidosController');
const {
  helpers: { emitirNotificacionAVendedorDePedido },
} = require('./notificacionesController');

function sanitizeForJson(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeForJson);
  if (typeof obj === 'object' && obj.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitizeForJson(v);
    return out;
  }
  return obj;
}

async function puedeAccederPedido(req, pedidoId) {
  const [rows] = await pool.execute(
    'SELECT id, cliente_usuario_id, vendedor_id, empresa_id, numero_pedido, estado FROM pedidos WHERE id = ?',
    [pedidoId]
  );
  if (rows.length === 0) return { ok: false, status: 404, error: 'Pedido no encontrado' };
  const pedido = rows[0];
  const rol = (req.user?.rol || '').toLowerCase();
  if (rol === 'cliente') {
    if (Number(pedido.cliente_usuario_id) !== Number(req.user.id)) {
      return { ok: false, status: 403, error: 'No puede acceder a este pedido' };
    }
  }
  return { ok: true, pedido };
}

/** Estados de pedido en los que un cliente puede pedir cancelación. */
const ESTADOS_CANCELABLES = new Set([
  'PENDIENTE',
  'ESPERA_COTIZACION',
  'COTIZACION_ENVIADA',
  'COTIZACION_RECHAZADA',
  'COTIZACION_APROBADA',
  'LISTO_PARA_COTIZACION',
]);

/**
 * GET /api/solicitudes-cancelacion?pedido_id=X
 * - Cliente: solo solicitudes de sus pedidos.
 * - Vendedor/Manager sin pedido_id: todas las PENDIENTES.
 */
const listar = async (req, res) => {
  try {
    const pedido_id = req.query.pedido_id ? parseInt(req.query.pedido_id, 10) : null;
    const estado = req.query.estado ? String(req.query.estado).toUpperCase() : null;
    const rol = (req.user?.rol || '').toLowerCase();

    if (pedido_id) {
      const access = await puedeAccederPedido(req, pedido_id);
      if (!access.ok) return res.status(access.status).json({ error: access.error });
      const params = [pedido_id];
      let estadoSql = '';
      if (estado) {
        estadoSql = ' AND sc.estado = ?';
        params.push(estado);
      }
      const [rows] = await pool.execute(
        `SELECT sc.id, sc.pedido_id, sc.cliente_usuario_id, sc.estado,
                sc.mensaje_cliente, sc.mensaje_rechazo,
                sc.fecha_solicitud, sc.fecha_revision, sc.revisado_por_usuario_id,
                u.nombre_completo AS cliente_nombre,
                r.nombre_completo AS revisor_nombre
         FROM solicitudes_cancelacion sc
         LEFT JOIN usuarios u ON u.id = sc.cliente_usuario_id
         LEFT JOIN usuarios r ON r.id = sc.revisado_por_usuario_id
         WHERE sc.pedido_id = ?${estadoSql}
         ORDER BY sc.fecha_solicitud DESC`,
        params
      );
      return res.json({ solicitudes: sanitizeForJson(rows) });
    }

    // Sin pedido_id
    if (rol === 'cliente') {
      const [rows] = await pool.execute(
        `SELECT sc.id, sc.pedido_id, sc.cliente_usuario_id, sc.estado,
                sc.mensaje_cliente, sc.mensaje_rechazo,
                sc.fecha_solicitud, sc.fecha_revision, sc.revisado_por_usuario_id,
                p.numero_pedido
         FROM solicitudes_cancelacion sc
         INNER JOIN pedidos p ON p.id = sc.pedido_id
         WHERE sc.cliente_usuario_id = ?
         ORDER BY sc.fecha_solicitud DESC`,
        [req.user.id]
      );
      return res.json({ solicitudes: sanitizeForJson(rows) });
    }

    // Vendedor/manager: todas (filtradas opcionalmente por estado).
    const params = [];
    let whereSql = '';
    if (estado) {
      whereSql = 'WHERE sc.estado = ?';
      params.push(estado);
    }
    const [rows] = await pool.execute(
      `SELECT sc.id, sc.pedido_id, sc.cliente_usuario_id, sc.estado,
              sc.mensaje_cliente, sc.mensaje_rechazo,
              sc.fecha_solicitud, sc.fecha_revision, sc.revisado_por_usuario_id,
              p.numero_pedido,
              u.nombre_completo AS cliente_nombre,
              r.nombre_completo AS revisor_nombre
       FROM solicitudes_cancelacion sc
       INNER JOIN pedidos p ON p.id = sc.pedido_id
       LEFT JOIN usuarios u ON u.id = sc.cliente_usuario_id
       LEFT JOIN usuarios r ON r.id = sc.revisado_por_usuario_id
       ${whereSql}
       ORDER BY sc.fecha_solicitud DESC`,
      params
    );
    return res.json({ solicitudes: sanitizeForJson(rows) });
  } catch (err) {
    console.error('Error listar solicitudes cancelación:', err);
    res.status(500).json({ error: 'Error al listar solicitudes' });
  }
};

/**
 * POST /api/solicitudes-cancelacion
 * Body: { pedido_id, mensaje_cliente? }
 * Solo CLIENTE.
 */
const crear = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { pedido_id, mensaje_cliente } = req.body || {};
    if (!pedido_id) {
      connection.release();
      return res.status(400).json({ error: 'pedido_id es requerido' });
    }
    const access = await puedeAccederPedido(req, pedido_id);
    if (!access.ok) {
      connection.release();
      return res.status(access.status).json({ error: access.error });
    }
    if (req.user.rol !== 'cliente') {
      connection.release();
      return res.status(403).json({ error: 'Solo el cliente puede solicitar la cancelación' });
    }
    if (Number(access.pedido.cliente_usuario_id) !== Number(req.user.id)) {
      connection.release();
      return res.status(403).json({ error: 'Solo puede solicitar cancelación de sus propios pedidos' });
    }
    if (!ESTADOS_CANCELABLES.has(access.pedido.estado)) {
      connection.release();
      return res.status(400).json({
        error: 'El pedido ya no puede cancelarse en su estado actual',
        estado: access.pedido.estado,
      });
    }

    const [existentes] = await connection.execute(
      "SELECT id FROM solicitudes_cancelacion WHERE pedido_id = ? AND estado = 'PENDIENTE' LIMIT 1",
      [pedido_id]
    );
    if (existentes.length > 0) {
      connection.release();
      return res.status(409).json({
        error: 'Ya existe una solicitud de cancelación pendiente para este pedido',
        solicitud_id: existentes[0].id,
      });
    }

    await connection.beginTransaction();
    const mensaje = mensaje_cliente ? String(mensaje_cliente).trim().slice(0, 2000) : null;
    const [ins] = await connection.execute(
      `INSERT INTO solicitudes_cancelacion (pedido_id, cliente_usuario_id, estado, mensaje_cliente)
       VALUES (?, ?, 'PENDIENTE', ?)`,
      [pedido_id, req.user.id, mensaje]
    );
    const solicitudId = ins.insertId;

    // Historial del pedido
    await connection.execute(
      `INSERT INTO historial_pedido (pedido_id, tipo_evento, descripcion, usuario_id, usuario_nombre)
       VALUES (?, 'SOLICITUD_MANAGER', ?, ?, ?)`,
      [
        pedido_id,
        mensaje
          ? `Cliente solicitó cancelación del pedido. Mensaje: ${mensaje}`
          : 'Cliente solicitó cancelación del pedido (sin mensaje)',
        req.user.id,
        req.user.nombre_completo || null,
      ]
    );

    // Notificar al vendedor del pedido
    try {
      await emitirNotificacionAVendedorDePedido(connection, {
        pedidoId: pedido_id,
        tipo: 'MENSAJE',
        titulo: `Solicitud de cancelación · ${access.pedido.numero_pedido || `Pedido #${pedido_id}`}`,
        mensaje: mensaje || 'El cliente solicitó cancelar este pedido.',
        contextoJson: { solicitud_cancelacion_id: solicitudId, pedido_id },
        remitenteUsuarioId: req.user.id,
      });
    } catch (notifErr) {
      console.warn('No se pudo emitir notificación de cancelación:', notifErr?.message || notifErr);
    }

    await connection.commit();
    connection.release();

    const [nueva] = await pool.execute(
      `SELECT sc.*, u.nombre_completo AS cliente_nombre
       FROM solicitudes_cancelacion sc
       LEFT JOIN usuarios u ON u.id = sc.cliente_usuario_id
       WHERE sc.id = ?`,
      [solicitudId]
    );
    res.status(201).json({ solicitud: sanitizeForJson(nueva[0]) });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    try { connection.release(); } catch {}
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una solicitud de cancelación pendiente' });
    }
    console.error('Error crear solicitud cancelación:', err);
    res.status(500).json({ error: 'Error al crear solicitud', details: err.message });
  }
};

/**
 * PATCH /api/solicitudes-cancelacion/:id
 * Body: { estado: 'APROBADA'|'RECHAZADA', mensaje_rechazo? }
 * Solo VENDEDOR/MANAGER.
 */
const actualizarEstado = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id = parseInt(req.params.id, 10);
    const { estado, mensaje_rechazo } = req.body || {};
    const estadoUpper = estado ? String(estado).toUpperCase() : '';
    if (estadoUpper !== 'APROBADA' && estadoUpper !== 'RECHAZADA') {
      connection.release();
      return res.status(400).json({ error: 'estado debe ser APROBADA o RECHAZADA' });
    }
    if (req.user.rol !== 'vendedor' && req.user.rol !== 'manager') {
      connection.release();
      return res.status(403).json({ error: 'Solo vendedor o manager puede responder solicitudes' });
    }

    const [sols] = await connection.execute(
      'SELECT id, pedido_id, estado, cliente_usuario_id, mensaje_cliente FROM solicitudes_cancelacion WHERE id = ?',
      [id]
    );
    if (sols.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const sol = sols[0];
    if (sol.estado !== 'PENDIENTE') {
      connection.release();
      return res.status(400).json({ error: 'La solicitud ya fue procesada' });
    }

    await connection.beginTransaction();

    if (estadoUpper === 'APROBADA') {
      // 1) Marcamos la solicitud APROBADA. Como FK pedido_id es CASCADE, al
      //    borrar el pedido la fila se eliminará. Registramos antes la
      //    aprobación para que si el caller necesita auditoría externa
      //    (logs/notificaciones) tenga consistencia.
      await connection.execute(
        `UPDATE solicitudes_cancelacion
            SET estado = 'APROBADA', fecha_revision = NOW(), revisado_por_usuario_id = ?, updated_at = NOW()
          WHERE id = ?`,
        [req.user.id, id]
      );

      // 2) Notificar al cliente ANTES de borrar el pedido (la notificación es
      //    independiente del pedido y debe persistir).
      try {
        const [ped] = await connection.execute(
          'SELECT id, numero_pedido, empresa_id, cliente_usuario_id FROM pedidos WHERE id = ?',
          [sol.pedido_id]
        );
        if (ped.length > 0 && ped[0].cliente_usuario_id) {
          await connection.execute(
            `INSERT INTO notificaciones (tipo, titulo, mensaje, contexto_json, remitente_usuario_id, destinatario_usuario_id, destinatario_empresa_id, leida)
             VALUES ('MENSAJE', ?, ?, ?, ?, ?, ?, 0)`,
            [
              `Cancelación aprobada · ${ped[0].numero_pedido || `Pedido #${sol.pedido_id}`}`,
              'Tu solicitud de cancelación fue aprobada y el pedido ya fue cancelado.',
              JSON.stringify({ solicitud_cancelacion_id: id, pedido_id: sol.pedido_id, resultado: 'APROBADA' }),
              req.user.id,
              ped[0].cliente_usuario_id,
              ped[0].empresa_id,
            ]
          );
        }
      } catch (notifErr) {
        console.warn('No se pudo emitir notificación de aprobación:', notifErr?.message || notifErr);
      }

      // 3) Ejecutar la cancelación destructiva del pedido (cascade limpia la solicitud).
      await cancelarPedidoEnConnection(connection, sol.pedido_id);

      await connection.commit();
      connection.release();
      return res.json({
        solicitud: { id, estado: 'APROBADA', pedido_id: sol.pedido_id },
        pedido_eliminado: true,
      });
    }

    // RECHAZADA
    const msgRechazo = mensaje_rechazo ? String(mensaje_rechazo).trim().slice(0, 2000) : null;
    await connection.execute(
      `UPDATE solicitudes_cancelacion
          SET estado = 'RECHAZADA', mensaje_rechazo = ?, fecha_revision = NOW(), revisado_por_usuario_id = ?, updated_at = NOW()
        WHERE id = ?`,
      [msgRechazo, req.user.id, id]
    );

    // Historial + notificación al cliente
    try {
      await connection.execute(
        `INSERT INTO historial_pedido (pedido_id, tipo_evento, descripcion, usuario_id, usuario_nombre)
         VALUES (?, 'SOLICITUD_MANAGER', ?, ?, ?)`,
        [
          sol.pedido_id,
          msgRechazo
            ? `Solicitud de cancelación rechazada. Motivo: ${msgRechazo}`
            : 'Solicitud de cancelación rechazada',
          req.user.id,
          req.user.nombre_completo || null,
        ]
      );

      const [ped] = await connection.execute(
        'SELECT numero_pedido, empresa_id, cliente_usuario_id FROM pedidos WHERE id = ?',
        [sol.pedido_id]
      );
      if (ped.length > 0 && ped[0].cliente_usuario_id) {
        await connection.execute(
          `INSERT INTO notificaciones (tipo, titulo, mensaje, contexto_json, remitente_usuario_id, destinatario_usuario_id, destinatario_empresa_id, leida)
           VALUES ('MENSAJE', ?, ?, ?, ?, ?, ?, 0)`,
          [
            `Cancelación rechazada · ${ped[0].numero_pedido || `Pedido #${sol.pedido_id}`}`,
            msgRechazo || 'Tu solicitud de cancelación fue rechazada.',
            JSON.stringify({ solicitud_cancelacion_id: id, pedido_id: sol.pedido_id, resultado: 'RECHAZADA' }),
            req.user.id,
            ped[0].cliente_usuario_id,
            ped[0].empresa_id,
          ]
        );
      }
    } catch (notifErr) {
      console.warn('No se pudo emitir notificación de rechazo:', notifErr?.message || notifErr);
    }

    await connection.commit();
    connection.release();

    const [updated] = await pool.execute(
      `SELECT sc.*, u.nombre_completo AS cliente_nombre, r.nombre_completo AS revisor_nombre
       FROM solicitudes_cancelacion sc
       LEFT JOIN usuarios u ON u.id = sc.cliente_usuario_id
       LEFT JOIN usuarios r ON r.id = sc.revisado_por_usuario_id
       WHERE sc.id = ?`,
      [id]
    );
    return res.json({ solicitud: sanitizeForJson(updated[0]) });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    try { connection.release(); } catch {}
    console.error('Error actualizar solicitud cancelación:', err);
    res.status(500).json({ error: 'Error al actualizar solicitud', details: err.message });
  }
};

module.exports = {
  listar,
  crear,
  actualizarEstado,
};
