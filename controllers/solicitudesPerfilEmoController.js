/**
 * Solicitudes de creación de perfiles EMO (cliente → vendedor).
 *
 * Flujo:
 *   1. El cliente crea una solicitud desde su perfil con `nombre_propuesto` + `notas`.
 *      Se valida que el nombre no colisione con `emo_perfiles.nombre` (case-insensitive)
 *      ni con otras solicitudes PENDIENTE de la misma empresa.
 *   2. Vendedor/manager listan pendientes y pueden:
 *      - Aprobar → crea `emo_perfiles` (visibilidad = PRIVADO) con asignación a la empresa.
 *        La solicitud queda con estado APROBADA y `perfil_creado_id` apuntando al nuevo perfil.
 *      - Rechazar → estado RECHAZADA con `motivo_rechazo`.
 *   3. El cliente puede cancelar sus solicitudes PENDIENTES.
 *
 * Notificaciones:
 *   - Al crear una solicitud → todos los managers y vendedores activos.
 *   - Al aprobar/rechazar → clientes de la empresa (emitirNotificacionAClientesDeEmpresa).
 */
const pool = require('../config/database');
const {
  helpers: { emitirNotificacion, emitirNotificacionAClientesDeEmpresa },
} = require('./notificacionesController');

const EMO_TIPOS_VALIDOS = ['PREOC', 'ANUAL', 'RETIRO', 'VISITA'];
const VISIBILIDADES_VALIDAS = ['GLOBAL', 'PRIVADO'];

async function obtenerEmpresaDelUsuario(userId) {
  const [rows] = await pool.execute('SELECT empresa_id FROM usuarios WHERE id = ?', [userId]);
  if (rows.length === 0) return null;
  return rows[0].empresa_id ?? null;
}

/**
 * POST /api/solicitudes-perfil-emo
 * Body: { nombre_propuesto, notas? }
 * Rol: cliente.
 */
exports.crear = async (req, res) => {
  try {
    const nombre = String(req.body?.nombre_propuesto ?? '').trim();
    const notas = (req.body?.notas ?? null) && String(req.body.notas).trim().slice(0, 2000);

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del perfil es requerido' });
    }
    if (nombre.length > 200) {
      return res.status(400).json({ error: 'El nombre es demasiado largo (máx 200 caracteres)' });
    }

    const empresaId = await obtenerEmpresaDelUsuario(req.user.id);
    if (!empresaId) {
      return res
        .status(400)
        .json({ error: 'Tu usuario no tiene una empresa asociada. Contacta a soporte.' });
    }

    // 1) ¿Ya existe un perfil con ese nombre? (case-insensitive + trim)
    const [existePerfil] = await pool.execute(
      `SELECT id, nombre FROM emo_perfiles
        WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?))
        LIMIT 1`,
      [nombre]
    );
    if (existePerfil.length > 0) {
      return res.status(409).json({
        error: `Ya existe un perfil llamado "${existePerfil[0].nombre}". Elige otro nombre.`,
      });
    }

    // 2) ¿La empresa ya tiene una solicitud pendiente con ese nombre?
    const [existeSolicitud] = await pool.execute(
      `SELECT id FROM solicitudes_perfil_emo
        WHERE empresa_id = ? AND estado = 'PENDIENTE'
          AND LOWER(TRIM(nombre_propuesto)) = LOWER(?)
        LIMIT 1`,
      [empresaId, nombre]
    );
    if (existeSolicitud.length > 0) {
      return res
        .status(409)
        .json({ error: 'Ya solicitaste un perfil con ese nombre; está pendiente de revisión.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        `INSERT INTO solicitudes_perfil_emo (empresa_id, usuario_id, nombre_propuesto, notas)
         VALUES (?, ?, ?, ?)`,
        [empresaId, req.user.id, nombre, notas || null]
      );
      const solicitudId = result.insertId;

      // Notificar a managers y vendedores (destinatario_usuario_id por cada uno).
      try {
        const [staff] = await conn.execute(
          "SELECT id FROM usuarios WHERE activo = 1 AND rol IN ('vendedor','manager','admin','administrador','superadmin')"
        );
        const [emp] = await conn.execute('SELECT razon_social FROM empresas WHERE id = ?', [empresaId]);
        const empresaNombre = emp[0]?.razon_social || `Empresa #${empresaId}`;
        for (const u of staff) {
          await emitirNotificacion(conn, {
            tipo: 'SOLICITUD_PERFIL_EMO',
            titulo: 'Nueva solicitud de perfil EMO',
            mensaje: `${empresaNombre} solicitó crear el perfil "${nombre}".`,
            contextoJson: {
              evento: 'SOLICITUD_PERFIL_EMO_CREADA',
              solicitud_id: solicitudId,
              empresa_id: empresaId,
              nombre_propuesto: nombre,
            },
            remitenteUsuarioId: req.user.id,
            destinatarioUsuarioId: u.id,
          });
        }
      } catch (notifErr) {
        console.warn('[solicitudes-perfil-emo] notificación falló:', notifErr?.message || notifErr);
      }

      await conn.commit();

      const [nueva] = await pool.execute(
        `SELECT id, empresa_id, usuario_id, nombre_propuesto, notas, estado, created_at
           FROM solicitudes_perfil_emo WHERE id = ?`,
        [solicitudId]
      );
      return res.status(201).json({ solicitud: nueva[0] });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[solicitudes-perfil-emo] crear error:', err);
    return res.status(500).json({ error: 'Error al crear la solicitud' });
  }
};

/**
 * GET /api/solicitudes-perfil-emo/mias
 * Devuelve las solicitudes del cliente autenticado (todas, ordenadas por fecha desc).
 */
exports.listarMias = async (req, res) => {
  try {
    const empresaId = await obtenerEmpresaDelUsuario(req.user.id);
    if (!empresaId) {
      return res.json({ solicitudes: [] });
    }
    const [rows] = await pool.execute(
      `SELECT s.id, s.empresa_id, s.usuario_id, s.nombre_propuesto, s.notas, s.estado,
              s.motivo_rechazo, s.perfil_creado_id, s.created_at, s.resuelta_at,
              p.nombre AS perfil_nombre
         FROM solicitudes_perfil_emo s
         LEFT JOIN emo_perfiles p ON p.id = s.perfil_creado_id
        WHERE s.empresa_id = ?
        ORDER BY s.created_at DESC`,
      [empresaId]
    );
    return res.json({ solicitudes: rows });
  } catch (err) {
    console.error('[solicitudes-perfil-emo] listarMias error:', err);
    return res.status(500).json({ error: 'Error al listar solicitudes' });
  }
};

/**
 * GET /api/solicitudes-perfil-emo
 * Vendedor/manager. Query: estado (default PENDIENTE) | ALL para traer todo.
 */
exports.listarParaStaff = async (req, res) => {
  try {
    const estadoQ = String(req.query?.estado ?? 'PENDIENTE').trim().toUpperCase();
    const estadosValidos = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA'];

    let whereEstado = '';
    const params = [];
    if (estadoQ !== 'ALL') {
      if (!estadosValidos.includes(estadoQ)) {
        return res.status(400).json({ error: 'estado inválido' });
      }
      whereEstado = 'WHERE s.estado = ?';
      params.push(estadoQ);
    }

    const [rows] = await pool.execute(
      `SELECT s.id, s.empresa_id, s.usuario_id, s.nombre_propuesto, s.notas, s.estado,
              s.motivo_rechazo, s.perfil_creado_id, s.created_at, s.resuelta_at,
              u.nombre_completo AS solicitante_nombre, u.email AS solicitante_email,
              e.razon_social AS empresa_nombre, e.ruc AS empresa_ruc,
              p.nombre AS perfil_nombre
         FROM solicitudes_perfil_emo s
         LEFT JOIN usuarios u ON u.id = s.usuario_id
         LEFT JOIN empresas e ON e.id = s.empresa_id
         LEFT JOIN emo_perfiles p ON p.id = s.perfil_creado_id
         ${whereEstado}
        ORDER BY (s.estado = 'PENDIENTE') DESC, s.created_at DESC`,
      params
    );
    return res.json({ solicitudes: rows });
  } catch (err) {
    console.error('[solicitudes-perfil-emo] listarParaStaff error:', err);
    return res.status(500).json({ error: 'Error al listar solicitudes' });
  }
};

/**
 * POST /api/solicitudes-perfil-emo/:id/aprobar
 * Body: {
 *   nombre_final?,
 *   visibilidad?: 'GLOBAL'|'PRIVADO'  (default PRIVADO),
 *   tipo_emo?: 'PREOC'|'ANUAL'|'RETIRO'|'VISITA'  (default PREOC; el vendedor asigna exámenes bajo ese tipo)
 * }
 * Rol: vendedor/manager.
 */
exports.aprobar = async (req, res) => {
  const id = parseInt(String(req.params?.id ?? ''), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }

  const visibilidadRaw = String(req.body?.visibilidad ?? 'PRIVADO').trim().toUpperCase();
  if (!VISIBILIDADES_VALIDAS.includes(visibilidadRaw)) {
    return res.status(400).json({ error: 'visibilidad inválida (GLOBAL|PRIVADO)' });
  }
  const tipoEmoRaw = String(req.body?.tipo_emo ?? 'PREOC').trim().toUpperCase();
  if (!EMO_TIPOS_VALIDOS.includes(tipoEmoRaw)) {
    return res.status(400).json({ error: 'tipo_emo inválido (PREOC|ANUAL|RETIRO|VISITA)' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT * FROM solicitudes_perfil_emo WHERE id = ? FOR UPDATE',
      [id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const sol = rows[0];
    if (sol.estado !== 'PENDIENTE') {
      await conn.rollback();
      return res.status(409).json({ error: `La solicitud ya está ${sol.estado.toLowerCase()}.` });
    }

    const nombreFinal =
      (req.body?.nombre_final ? String(req.body.nombre_final).trim() : '') || sol.nombre_propuesto;

    // Validar duplicado antes de crear
    const [existeNombre] = await conn.execute(
      'SELECT id FROM emo_perfiles WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1',
      [nombreFinal]
    );
    if (existeNombre.length > 0) {
      await conn.rollback();
      return res
        .status(409)
        .json({ error: 'Ya existe un perfil con ese nombre. Edita el nombre final antes de aprobar.' });
    }

    // Crear perfil con la visibilidad elegida por el vendedor
    const [insPerfil] = await conn.execute(
      'INSERT INTO emo_perfiles (nombre, visibilidad) VALUES (?, ?)',
      [nombreFinal, visibilidadRaw]
    );
    const perfilId = insPerfil.insertId;

    // Si es PRIVADO, asignar a la empresa que solicitó el perfil
    if (visibilidadRaw === 'PRIVADO') {
      await conn.execute(
        'INSERT INTO emo_perfil_asignacion (perfil_id, empresa_id) VALUES (?, ?)',
        [perfilId, sol.empresa_id]
      );
    }

    // Marcar solicitud como aprobada
    await conn.execute(
      `UPDATE solicitudes_perfil_emo
          SET estado = 'APROBADA',
              perfil_creado_id = ?,
              resuelto_por_usuario_id = ?,
              resuelta_at = NOW()
        WHERE id = ?`,
      [perfilId, req.user.id, id]
    );

    // Notificar al cliente (sin exámenes aún; el vendedor los asigna bajo el tipo EMO elegido).
    const visibilidadLabel = visibilidadRaw === 'GLOBAL' ? 'global' : 'privado de tu empresa';
    try {
      await emitirNotificacionAClientesDeEmpresa(conn, {
        empresaId: sol.empresa_id,
        tipo: 'SOLICITUD_PERFIL_EMO',
        titulo: `Solicitud de perfil "${nombreFinal}" aceptada`,
        mensaje: `Tu vendedor creará el perfil (${visibilidadLabel}, tipo ${tipoEmoRaw}) y asignará los exámenes. Podrás usarlo en pedidos cuando esté listo.`,
        contextoJson: {
          evento: 'SOLICITUD_PERFIL_EMO_APROBADA',
          solicitud_id: id,
          perfil_id: perfilId,
          nombre: nombreFinal,
          visibilidad: visibilidadRaw,
          tipo_emo: tipoEmoRaw,
        },
        remitenteUsuarioId: req.user.id,
      });
    } catch (notifErr) {
      console.warn('[solicitudes-perfil-emo] notif aprobar falló:', notifErr?.message || notifErr);
    }

    await conn.commit();
    return res.json({
      solicitud_id: id,
      perfil_id: perfilId,
      nombre: nombreFinal,
      visibilidad: visibilidadRaw,
      tipo_emo: tipoEmoRaw,
      estado: 'APROBADA',
    });
  } catch (err) {
    await conn.rollback();
    console.error('[solicitudes-perfil-emo] aprobar error:', err);
    return res.status(500).json({ error: 'Error al aprobar la solicitud' });
  } finally {
    conn.release();
  }
};

/**
 * POST /api/solicitudes-perfil-emo/:id/rechazar
 * Body: { motivo? }
 * Rol: vendedor/manager.
 */
exports.rechazar = async (req, res) => {
  const id = parseInt(String(req.params?.id ?? ''), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }
  const motivo = String(req.body?.motivo ?? '').trim().slice(0, 1000) || null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      'SELECT * FROM solicitudes_perfil_emo WHERE id = ? FOR UPDATE',
      [id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const sol = rows[0];
    if (sol.estado !== 'PENDIENTE') {
      await conn.rollback();
      return res.status(409).json({ error: `La solicitud ya está ${sol.estado.toLowerCase()}.` });
    }

    await conn.execute(
      `UPDATE solicitudes_perfil_emo
          SET estado = 'RECHAZADA',
              motivo_rechazo = ?,
              resuelto_por_usuario_id = ?,
              resuelta_at = NOW()
        WHERE id = ?`,
      [motivo, req.user.id, id]
    );

    try {
      await emitirNotificacionAClientesDeEmpresa(conn, {
        empresaId: sol.empresa_id,
        tipo: 'SOLICITUD_PERFIL_EMO',
        titulo: `Perfil "${sol.nombre_propuesto}" no aprobado`,
        mensaje: motivo
          ? `Tu solicitud fue rechazada. Motivo: ${motivo}`
          : 'Tu solicitud fue rechazada por el vendedor.',
        contextoJson: {
          evento: 'SOLICITUD_PERFIL_EMO_RECHAZADA',
          solicitud_id: id,
          motivo: motivo || null,
        },
        remitenteUsuarioId: req.user.id,
      });
    } catch (notifErr) {
      console.warn('[solicitudes-perfil-emo] notif rechazar falló:', notifErr?.message || notifErr);
    }

    await conn.commit();
    return res.json({ solicitud_id: id, estado: 'RECHAZADA' });
  } catch (err) {
    await conn.rollback();
    console.error('[solicitudes-perfil-emo] rechazar error:', err);
    return res.status(500).json({ error: 'Error al rechazar la solicitud' });
  } finally {
    conn.release();
  }
};

/**
 * DELETE /api/solicitudes-perfil-emo/:id
 * Rol: cliente. Solo puede cancelar sus propias solicitudes PENDIENTES.
 */
exports.cancelar = async (req, res) => {
  const id = parseInt(String(req.params?.id ?? ''), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id inválido' });
  }
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM solicitudes_perfil_emo WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const sol = rows[0];
    if (Number(sol.usuario_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'No puedes cancelar solicitudes de otro usuario' });
    }
    if (sol.estado !== 'PENDIENTE') {
      return res
        .status(409)
        .json({ error: `Ya no se puede cancelar (estado ${sol.estado.toLowerCase()}).` });
    }
    await pool.execute(
      "UPDATE solicitudes_perfil_emo SET estado = 'CANCELADA', resuelta_at = NOW() WHERE id = ?",
      [id]
    );
    return res.json({ solicitud_id: id, estado: 'CANCELADA' });
  } catch (err) {
    console.error('[solicitudes-perfil-emo] cancelar error:', err);
    return res.status(500).json({ error: 'Error al cancelar la solicitud' });
  }
};

/**
 * GET /api/solicitudes-perfil-emo/mi-empresa/perfiles-privados
 * Devuelve los perfiles PRIVADOS ya asignados a la empresa del cliente.
 * Es una vista compacta útil para la pantalla del cliente.
 */
exports.listarPerfilesPrivadosMiEmpresa = async (req, res) => {
  try {
    const empresaId = await obtenerEmpresaDelUsuario(req.user.id);
    if (!empresaId) return res.json({ perfiles: [] });

    const [rows] = await pool.execute(
      `SELECT p.id, p.nombre, p.visibilidad,
              (SELECT COUNT(DISTINCT mpe.examen_id)
                 FROM emo_perfil_examenes mpe
                WHERE mpe.perfil_id = p.id) AS total_examenes
         FROM emo_perfiles p
        WHERE p.visibilidad = 'PRIVADO'
          AND EXISTS (
            SELECT 1 FROM emo_perfil_asignacion epa
             WHERE epa.perfil_id = p.id AND epa.empresa_id = ?
          )
        ORDER BY p.nombre ASC`,
      [empresaId]
    );
    return res.json({ perfiles: rows });
  } catch (err) {
    console.error('[solicitudes-perfil-emo] listarPerfilesPrivados error:', err);
    return res.status(500).json({ error: 'Error al listar perfiles privados' });
  }
};
