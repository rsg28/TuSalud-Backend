const pool = require('../config/database');

/**
 * Helpers reutilizables desde otros controladores (auto-emisión).
 *
 *   - emitirNotificacion({ ... }) inserta una fila y normaliza thread_id.
 *   - emitirNotificacionAClientesDeEmpresa({ ... }) busca todos los usuarios
 *     con rol 'cliente' y empresa_id = X y emite una notificación a cada uno.
 *     Si no hay ningún cliente vinculado, emite una notificación dirigida a
 *     la empresa (destinatario_empresa_id) para que aparezca cuando un cliente
 *     se vincule en el futuro.
 */
async function emitirNotificacion(conn, params) {
  const {
    tipo,
    titulo,
    mensaje = null,
    contextoJson = null,
    remitenteUsuarioId = null,
    destinatarioUsuarioId = null,
    destinatarioEmpresaId = null,
    threadId = null,
  } = params;

  const ctxJson = contextoJson ? JSON.stringify(contextoJson) : null;

  const [result] = await conn.execute(
    `INSERT INTO notificaciones
      (thread_id, tipo, titulo, mensaje, contexto_json,
       remitente_usuario_id, destinatario_usuario_id, destinatario_empresa_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      threadId,
      tipo,
      titulo,
      mensaje,
      ctxJson,
      remitenteUsuarioId,
      destinatarioUsuarioId,
      destinatarioEmpresaId,
    ]
  );
  const insertedId = result.insertId;
  // Si no se pasó thread_id, autoreferenciar (la 1ra notif define el thread).
  if (!threadId) {
    await conn.execute('UPDATE notificaciones SET thread_id = ? WHERE id = ?', [insertedId, insertedId]);
  }
  return insertedId;
}

async function emitirNotificacionAClientesDeEmpresa(conn, params) {
  const { empresaId } = params;
  const [clientes] = await conn.execute(
    "SELECT id FROM usuarios WHERE rol = 'cliente' AND activo = 1 AND empresa_id = ?",
    [empresaId]
  );
  if (clientes.length === 0) {
    // Sin clientes vinculados → notificación a nivel empresa (se mostrará al
    // primer cliente que se vincule, mediante GET /mias).
    await emitirNotificacion(conn, {
      ...params,
      destinatarioEmpresaId: empresaId,
    });
    return 1;
  }
  let total = 0;
  for (const c of clientes) {
    await emitirNotificacion(conn, {
      ...params,
      destinatarioUsuarioId: c.id,
      destinatarioEmpresaId: empresaId,
    });
    total += 1;
  }
  return total;
}

/* ============================================================================
 * Endpoints REST
 * ========================================================================== */

/**
 * Listar notificaciones del usuario actual.
 *   - Recibe (destinatario directo o vía empresa).
 *   - O envió (remitente) — para que el vendedor vea su historial.
 *
 * Query: ?solo_no_leidas=1 (solo recibidas no leídas), ?limit=N, ?thread_id=N
 */
exports.listarMias = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ error: 'Usuario no autenticado' });

    const soloNoLeidas = String(req.query?.solo_no_leidas || '').trim() === '1';
    const limit = Math.min(parseInt(String(req.query?.limit || '100'), 10) || 100, 500);
    const threadId = req.query?.thread_id ? parseInt(String(req.query.thread_id), 10) : null;

    const [user] = await pool.execute('SELECT empresa_id FROM usuarios WHERE id = ?', [usuarioId]);
    const empresaIdUsuario = user[0]?.empresa_id ?? null;

    const params = [];
    const conds = [];
    // Recibidas (directas)
    conds.push('n.destinatario_usuario_id = ?');
    params.push(usuarioId);
    // Recibidas vía empresa
    if (empresaIdUsuario != null) {
      conds.push('n.destinatario_empresa_id = ?');
      params.push(empresaIdUsuario);
    }
    // Enviadas
    conds.push('n.remitente_usuario_id = ?');
    params.push(usuarioId);

    let sql = `SELECT n.id, n.thread_id, n.tipo, n.titulo, n.mensaje, n.contexto_json,
                      n.remitente_usuario_id, n.destinatario_usuario_id, n.destinatario_empresa_id,
                      n.leida, n.created_at,
                      ru.nombre_completo AS remitente_nombre,
                      du.nombre_completo AS destinatario_nombre,
                      e.razon_social    AS destinatario_empresa_nombre
                 FROM notificaciones n
            LEFT JOIN usuarios ru ON ru.id = n.remitente_usuario_id
            LEFT JOIN usuarios du ON du.id = n.destinatario_usuario_id
            LEFT JOIN empresas e  ON e.id  = n.destinatario_empresa_id
                WHERE (${conds.join(' OR ')})`;
    if (soloNoLeidas) {
      sql += ' AND n.leida = 0 AND n.remitente_usuario_id <> ?';
      params.push(usuarioId);
    }
    if (threadId) {
      sql += ' AND n.thread_id = ?';
      params.push(threadId);
    }
    sql += ' ORDER BY n.created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query(sql, params);
    // Parsear contexto_json (algunos drivers ya lo entregan parseado).
    rows.forEach((r) => {
      if (typeof r.contexto_json === 'string' && r.contexto_json) {
        try { r.contexto_json = JSON.parse(r.contexto_json); } catch { /* ignore */ }
      }
    });
    res.json({ notificaciones: rows });
  } catch (error) {
    console.error('Error al listar notificaciones:', error);
    res.status(500).json({ error: 'Error al listar notificaciones' });
  }
};

/**
 * Conteo rápido de no leídas (para badge en UI).
 */
exports.contadorNoLeidas = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ error: 'Usuario no autenticado' });

    const [user] = await pool.execute('SELECT empresa_id FROM usuarios WHERE id = ?', [usuarioId]);
    const empresaIdUsuario = user[0]?.empresa_id ?? null;

    const params = [usuarioId, usuarioId];
    let extraEmpresa = '';
    if (empresaIdUsuario != null) {
      extraEmpresa = 'OR destinatario_empresa_id = ?';
      params.push(empresaIdUsuario);
    }
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM notificaciones
        WHERE leida = 0
          AND remitente_usuario_id <> ?
          AND (destinatario_usuario_id = ? ${extraEmpresa})`,
      params
    );
    res.json({ no_leidas: Number(rows[0]?.total ?? 0) });
  } catch (error) {
    console.error('Error contador no leídas:', error);
    res.status(500).json({ error: 'Error al contar notificaciones' });
  }
};

/** Marcar una notificación como leída (debe ser destinatario). */
exports.marcarLeida = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ error: 'Usuario no autenticado' });
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'id inválido' });
    }
    const [user] = await pool.execute('SELECT empresa_id FROM usuarios WHERE id = ?', [usuarioId]);
    const empresaIdUsuario = user[0]?.empresa_id ?? null;

    const [result] = await pool.execute(
      `UPDATE notificaciones SET leida = 1
        WHERE id = ?
          AND (destinatario_usuario_id = ? OR (destinatario_empresa_id IS NOT NULL AND destinatario_empresa_id = ?))`,
      [id, usuarioId, empresaIdUsuario]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada o no autorizada' });
    }
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al marcar leída:', error);
    res.status(500).json({ error: 'Error al marcar como leída' });
  }
};

/** Marcar todas las recibidas como leídas. */
exports.marcarTodasLeidas = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ error: 'Usuario no autenticado' });
    const [user] = await pool.execute('SELECT empresa_id FROM usuarios WHERE id = ?', [usuarioId]);
    const empresaIdUsuario = user[0]?.empresa_id ?? null;

    await pool.execute(
      `UPDATE notificaciones SET leida = 1
        WHERE leida = 0
          AND remitente_usuario_id <> ?
          AND (destinatario_usuario_id = ?
               OR (destinatario_empresa_id IS NOT NULL AND destinatario_empresa_id = ?))`,
      [usuarioId, usuarioId, empresaIdUsuario]
    );
    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar todas leídas:', error);
    res.status(500).json({ error: 'Error al marcar todas como leídas' });
  }
};

/**
 * Crear una notificación libre (manager/vendedor → cliente o usuario).
 * Body: { titulo, mensaje, destinatario_usuario_id?, destinatario_empresa_id?, contexto_json? }
 */
exports.crear = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      conn.release();
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    const {
      titulo,
      mensaje,
      destinatario_usuario_id,
      destinatario_empresa_id,
      contexto_json,
    } = req.body;

    if (!titulo || !String(titulo).trim()) {
      conn.release();
      return res.status(400).json({ error: 'El título es obligatorio' });
    }
    if (!destinatario_usuario_id && !destinatario_empresa_id) {
      conn.release();
      return res.status(400).json({ error: 'Indica un destinatario (usuario o empresa)' });
    }
    await conn.beginTransaction();
    const id = await emitirNotificacion(conn, {
      tipo: 'MENSAJE',
      titulo: String(titulo).trim(),
      mensaje: mensaje ? String(mensaje) : null,
      contextoJson: contexto_json || null,
      remitenteUsuarioId: usuarioId,
      destinatarioUsuarioId: destinatario_usuario_id ? parseInt(String(destinatario_usuario_id), 10) : null,
      destinatarioEmpresaId: destinatario_empresa_id ? parseInt(String(destinatario_empresa_id), 10) : null,
    });
    await conn.commit();
    res.status(201).json({ message: 'Notificación creada', id });
  } catch (error) {
    await conn.rollback();
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error al crear notificación' });
  } finally {
    conn.release();
  }
};

/**
 * Responder a un thread existente. Cualquier participante (remitente original
 * o destinatario) puede responder; la respuesta se dirige a la otra parte.
 *
 * Body: { mensaje } (opcional `titulo`)
 */
exports.responder = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) { conn.release(); return res.status(401).json({ error: 'Usuario no autenticado' }); }
    const id = parseInt(String(req.params.id), 10);
    const { mensaje, titulo } = req.body;
    if (!Number.isInteger(id) || id <= 0) { conn.release(); return res.status(400).json({ error: 'id inválido' }); }
    if (!mensaje || !String(mensaje).trim()) { conn.release(); return res.status(400).json({ error: 'El mensaje es obligatorio' }); }

    const [rows] = await conn.execute(
      `SELECT id, thread_id, titulo, remitente_usuario_id, destinatario_usuario_id, destinatario_empresa_id, contexto_json
         FROM notificaciones WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) { conn.release(); return res.status(404).json({ error: 'Notificación no encontrada' }); }
    const original = rows[0];

    const [user] = await conn.execute('SELECT empresa_id, rol FROM usuarios WHERE id = ?', [usuarioId]);
    const empresaIdUsuario = user[0]?.empresa_id ?? null;

    const esRemitente = original.remitente_usuario_id === usuarioId;
    const esDestUsuario = original.destinatario_usuario_id === usuarioId;
    const esDestEmpresa =
      original.destinatario_empresa_id != null && empresaIdUsuario === original.destinatario_empresa_id;

    if (!esRemitente && !esDestUsuario && !esDestEmpresa) {
      conn.release();
      return res.status(403).json({ error: 'No participas en este hilo' });
    }

    // El destinatario de la respuesta es la "otra parte".
    let destUserId = null;
    let destEmpresaId = null;
    if (esRemitente) {
      destUserId = original.destinatario_usuario_id;
      destEmpresaId = original.destinatario_empresa_id;
    } else {
      // Cliente respondiendo → la respuesta va al remitente original.
      destUserId = original.remitente_usuario_id;
    }

    await conn.beginTransaction();
    const newId = await emitirNotificacion(conn, {
      tipo: 'RESPUESTA',
      titulo: titulo ? String(titulo) : `Re: ${original.titulo}`,
      mensaje: String(mensaje),
      contextoJson: original.contexto_json
        ? (typeof original.contexto_json === 'string' ? JSON.parse(original.contexto_json) : original.contexto_json)
        : null,
      remitenteUsuarioId: usuarioId,
      destinatarioUsuarioId: destUserId,
      destinatarioEmpresaId: destEmpresaId,
      threadId: original.thread_id || original.id,
    });
    await conn.commit();
    res.status(201).json({ message: 'Respuesta enviada', id: newId, thread_id: original.thread_id || original.id });
  } catch (error) {
    await conn.rollback();
    console.error('Error al responder notificación:', error);
    res.status(500).json({ error: 'Error al responder notificación' });
  } finally {
    conn.release();
  }
};

module.exports.helpers = {
  emitirNotificacion,
  emitirNotificacionAClientesDeEmpresa,
};
