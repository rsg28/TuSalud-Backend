/**
 * Controller para `solicitudes_ver_precios_detalle`.
 *
 * Contexto de negocio:
 *   - Después de que el cliente envía su primer wizard "nuevo pedido", el
 *     vendedor le devuelve una cotización. A partir de ese momento el cliente
 *     solo debe ver precios agregados por perfil, NO el precio de cada examen
 *     individual dentro del perfil (regla nueva, aplica a cotizaciones y
 *     facturas del mismo pedido).
 *   - Si el cliente necesita ver el desglose por examen, envía una solicitud.
 *   - El VENDEDOR/MANAGER la APRUEBA (activa `pedidos.cliente_ve_precios_individuales = 1`,
 *     lo que desbloquea la vista detallada del cliente para todas las cotizaciones y
 *     factura del pedido) o la RECHAZA con mensaje opcional.
 *   - Solo puede existir una solicitud PENDIENTE por pedido en simultáneo
 *     (se enforza a nivel de aplicación).
 */
const pool = require('../config/database');
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
    'SELECT id, cliente_usuario_id, vendedor_id, empresa_id, numero_pedido, estado, cliente_ve_precios_individuales FROM pedidos WHERE id = ?',
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

/**
 * GET /api/solicitudes-ver-precios-detalle?pedido_id=X&estado=Y
 * - Con pedido_id: solicitudes de ese pedido (previo control de acceso).
 * - Cliente sin pedido_id: solo sus solicitudes.
 * - Vendedor/manager sin pedido_id: todas (opcionalmente filtradas por estado).
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
        estadoSql = ' AND s.estado = ?';
        params.push(estado);
      }
      const [rows] = await pool.execute(
        `SELECT s.id, s.pedido_id, s.cliente_usuario_id, s.estado,
                s.mensaje_cliente, s.mensaje_rechazo,
                s.fecha_solicitud, s.fecha_revision, s.revisado_por_usuario_id,
                u.nombre_completo AS cliente_nombre,
                r.nombre_completo AS revisor_nombre
         FROM solicitudes_ver_precios_detalle s
         LEFT JOIN usuarios u ON u.id = s.cliente_usuario_id
         LEFT JOIN usuarios r ON r.id = s.revisado_por_usuario_id
         WHERE s.pedido_id = ?${estadoSql}
         ORDER BY s.fecha_solicitud DESC`,
        params
      );
      return res.json({ solicitudes: sanitizeForJson(rows) });
    }

    if (rol === 'cliente') {
      const [rows] = await pool.execute(
        `SELECT s.id, s.pedido_id, s.cliente_usuario_id, s.estado,
                s.mensaje_cliente, s.mensaje_rechazo,
                s.fecha_solicitud, s.fecha_revision, s.revisado_por_usuario_id,
                p.numero_pedido
         FROM solicitudes_ver_precios_detalle s
         INNER JOIN pedidos p ON p.id = s.pedido_id
         WHERE s.cliente_usuario_id = ?
         ORDER BY s.fecha_solicitud DESC`,
        [req.user.id]
      );
      return res.json({ solicitudes: sanitizeForJson(rows) });
    }

    const params = [];
    let whereSql = '';
    if (estado) {
      whereSql = 'WHERE s.estado = ?';
      params.push(estado);
    }
    const [rows] = await pool.execute(
      `SELECT s.id, s.pedido_id, s.cliente_usuario_id, s.estado,
              s.mensaje_cliente, s.mensaje_rechazo,
              s.fecha_solicitud, s.fecha_revision, s.revisado_por_usuario_id,
              p.numero_pedido,
              u.nombre_completo AS cliente_nombre,
              r.nombre_completo AS revisor_nombre
       FROM solicitudes_ver_precios_detalle s
       INNER JOIN pedidos p ON p.id = s.pedido_id
       LEFT JOIN usuarios u ON u.id = s.cliente_usuario_id
       LEFT JOIN usuarios r ON r.id = s.revisado_por_usuario_id
       ${whereSql}
       ORDER BY s.fecha_solicitud DESC`,
      params
    );
    return res.json({ solicitudes: sanitizeForJson(rows) });
  } catch (err) {
    console.error('Error listar solicitudes ver precios detalle:', err);
    res.status(500).json({ error: 'Error al listar solicitudes' });
  }
};

/**
 * POST /api/solicitudes-ver-precios-detalle
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
      return res.status(403).json({ error: 'Solo el cliente puede solicitar ver el detalle de precios' });
    }
    if (Number(access.pedido.cliente_usuario_id) !== Number(req.user.id)) {
      connection.release();
      return res.status(403).json({ error: 'Solo puede solicitar sobre sus propios pedidos' });
    }
    if (Number(access.pedido.cliente_ve_precios_individuales) === 1) {
      connection.release();
      return res.status(400).json({
        error: 'Este pedido ya tiene habilitada la vista detallada de precios',
      });
    }

    const [existentes] = await connection.execute(
      "SELECT id FROM solicitudes_ver_precios_detalle WHERE pedido_id = ? AND estado = 'PENDIENTE' LIMIT 1",
      [pedido_id]
    );
    if (existentes.length > 0) {
      connection.release();
      return res.status(409).json({
        error: 'Ya existe una solicitud pendiente para este pedido',
        solicitud_id: existentes[0].id,
      });
    }

    await connection.beginTransaction();
    const mensaje = mensaje_cliente ? String(mensaje_cliente).trim().slice(0, 2000) : null;
    const [ins] = await connection.execute(
      `INSERT INTO solicitudes_ver_precios_detalle (pedido_id, cliente_usuario_id, estado, mensaje_cliente)
       VALUES (?, ?, 'PENDIENTE', ?)`,
      [pedido_id, req.user.id, mensaje]
    );
    const solicitudId = ins.insertId;

    await connection.execute(
      `INSERT INTO historial_pedido (pedido_id, tipo_evento, descripcion, usuario_id, usuario_nombre)
       VALUES (?, 'SOLICITUD_MANAGER', ?, ?, ?)`,
      [
        pedido_id,
        mensaje
          ? `Cliente solicitó ver el detalle de precios individuales. Mensaje: ${mensaje}`
          : 'Cliente solicitó ver el detalle de precios individuales (sin mensaje)',
        req.user.id,
        req.user.nombre_completo || null,
      ]
    );

    try {
      await emitirNotificacionAVendedorDePedido(connection, {
        pedidoId: pedido_id,
        tipo: 'MENSAJE',
        titulo: `Solicitud de ver detalle de precios · ${access.pedido.numero_pedido || `Pedido #${pedido_id}`}`,
        mensaje: mensaje || 'El cliente solicitó ver el precio individual de cada examen.',
        contextoJson: { solicitud_ver_precios_detalle_id: solicitudId, pedido_id },
        remitenteUsuarioId: req.user.id,
      });
    } catch (notifErr) {
      console.warn('No se pudo emitir notificación de ver-precios-detalle:', notifErr?.message || notifErr);
    }

    await connection.commit();
    connection.release();

    const [nueva] = await pool.execute(
      `SELECT s.*, u.nombre_completo AS cliente_nombre
       FROM solicitudes_ver_precios_detalle s
       LEFT JOIN usuarios u ON u.id = s.cliente_usuario_id
       WHERE s.id = ?`,
      [solicitudId]
    );
    res.status(201).json({ solicitud: sanitizeForJson(nueva[0]) });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    try { connection.release(); } catch {}
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una solicitud pendiente' });
    }
    console.error('Error crear solicitud ver precios detalle:', err);
    res.status(500).json({ error: 'Error al crear solicitud', details: err.message });
  }
};

/**
 * PATCH /api/solicitudes-ver-precios-detalle/:id
 * Body: { estado: 'APROBADA'|'RECHAZADA', mensaje_rechazo? }
 * Solo VENDEDOR/MANAGER.
 *
 * Al aprobar, activa `pedidos.cliente_ve_precios_individuales = 1`.
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
      'SELECT id, pedido_id, estado, cliente_usuario_id, mensaje_cliente FROM solicitudes_ver_precios_detalle WHERE id = ?',
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
      await connection.execute(
        `UPDATE solicitudes_ver_precios_detalle
            SET estado = 'APROBADA', fecha_revision = NOW(), revisado_por_usuario_id = ?, updated_at = NOW()
          WHERE id = ?`,
        [req.user.id, id]
      );

      await connection.execute(
        `UPDATE pedidos SET cliente_ve_precios_individuales = 1, updated_at = NOW() WHERE id = ?`,
        [sol.pedido_id]
      );

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
              `Vista de precios aprobada · ${ped[0].numero_pedido || `Pedido #${sol.pedido_id}`}`,
              'Ya puede ver el precio individual de cada examen en cotización y factura.',
              JSON.stringify({ solicitud_ver_precios_detalle_id: id, pedido_id: sol.pedido_id, resultado: 'APROBADA' }),
              req.user.id,
              ped[0].cliente_usuario_id,
              ped[0].empresa_id,
            ]
          );
        }
      } catch (notifErr) {
        console.warn('No se pudo emitir notificación de aprobación ver-precios:', notifErr?.message || notifErr);
      }

      await connection.execute(
        `INSERT INTO historial_pedido (pedido_id, tipo_evento, descripcion, usuario_id, usuario_nombre)
         VALUES (?, 'SOLICITUD_MANAGER', ?, ?, ?)`,
        [
          sol.pedido_id,
          'Se aprobó al cliente ver el detalle de precios individuales del pedido.',
          req.user.id,
          req.user.nombre_completo || null,
        ]
      );

      await connection.commit();
      connection.release();

      const [updated] = await pool.execute(
        `SELECT s.*, u.nombre_completo AS cliente_nombre, r.nombre_completo AS revisor_nombre
         FROM solicitudes_ver_precios_detalle s
         LEFT JOIN usuarios u ON u.id = s.cliente_usuario_id
         LEFT JOIN usuarios r ON r.id = s.revisado_por_usuario_id
         WHERE s.id = ?`,
        [id]
      );
      return res.json({
        solicitud: sanitizeForJson(updated[0]),
        pedido_actualizado: { id: sol.pedido_id, cliente_ve_precios_individuales: 1 },
      });
    }

    // RECHAZADA
    const msgRechazo = mensaje_rechazo ? String(mensaje_rechazo).trim().slice(0, 2000) : null;
    await connection.execute(
      `UPDATE solicitudes_ver_precios_detalle
          SET estado = 'RECHAZADA', mensaje_rechazo = ?, fecha_revision = NOW(), revisado_por_usuario_id = ?, updated_at = NOW()
        WHERE id = ?`,
      [msgRechazo, req.user.id, id]
    );

    try {
      await connection.execute(
        `INSERT INTO historial_pedido (pedido_id, tipo_evento, descripcion, usuario_id, usuario_nombre)
         VALUES (?, 'SOLICITUD_MANAGER', ?, ?, ?)`,
        [
          sol.pedido_id,
          msgRechazo
            ? `Solicitud de ver detalle de precios rechazada. Motivo: ${msgRechazo}`
            : 'Solicitud de ver detalle de precios rechazada',
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
            `Vista de precios rechazada · ${ped[0].numero_pedido || `Pedido #${sol.pedido_id}`}`,
            msgRechazo || 'Tu solicitud de ver el detalle de precios fue rechazada.',
            JSON.stringify({ solicitud_ver_precios_detalle_id: id, pedido_id: sol.pedido_id, resultado: 'RECHAZADA' }),
            req.user.id,
            ped[0].cliente_usuario_id,
            ped[0].empresa_id,
          ]
        );
      }
    } catch (notifErr) {
      console.warn('No se pudo emitir notificación de rechazo ver-precios:', notifErr?.message || notifErr);
    }

    await connection.commit();
    connection.release();

    const [updated] = await pool.execute(
      `SELECT s.*, u.nombre_completo AS cliente_nombre, r.nombre_completo AS revisor_nombre
       FROM solicitudes_ver_precios_detalle s
       LEFT JOIN usuarios u ON u.id = s.cliente_usuario_id
       LEFT JOIN usuarios r ON r.id = s.revisado_por_usuario_id
       WHERE s.id = ?`,
      [id]
    );
    return res.json({ solicitud: sanitizeForJson(updated[0]) });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    try { connection.release(); } catch {}
    console.error('Error actualizar solicitud ver precios detalle:', err);
    res.status(500).json({ error: 'Error al actualizar solicitud', details: err.message });
  }
};

module.exports = {
  listar,
  crear,
  actualizarEstado,
};
