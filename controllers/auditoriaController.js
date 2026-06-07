/**
 * GET /api/auditoria — listado filtrable del `audit_log`.
 * GET /api/auditoria/resumen — agregados (por rol, por usuario, por acción).
 */

const pool = require('../config/database');
const { listarAuditoria } = require('../utils/audit');

async function listar(req, res) {
  try {
    const result = await listarAuditoria({
      limit: req.query.limit,
      offset: req.query.offset,
      usuarioId: req.query.usuario_id,
      rol: req.query.rol,
      accion: req.query.accion,
      recursoTipo: req.query.recurso_tipo,
      recursoId: req.query.recurso_id,
      desde: req.query.desde,
      hasta: req.query.hasta,
    });
    res.json(result);
  } catch (err) {
    console.error('Error listando auditoría:', err);
    res.status(500).json({ error: 'Error listando auditoría' });
  }
}

/**
 * GET /api/auditoria/resumen
 *
 * Devuelve agregados útiles para una vista "actividad" en la app:
 *   - por_rol:     cuántos eventos por rol en el rango
 *   - por_usuario: top usuarios con más actividad
 *   - por_accion:  desglose por verbo (CREAR_PEDIDO, APROBAR_COTIZACION, ...)
 *   - reciente:    últimas N entradas (default 25)
 *
 * Filtros: ?desde=...&hasta=...&top=10
 */
async function resumen(req, res) {
  try {
    const where = [];
    const params = [];
    if (req.query.desde) {
      where.push('ts >= ?');
      params.push(req.query.desde);
    }
    if (req.query.hasta) {
      where.push('ts <= ?');
      params.push(req.query.hasta);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const top = Math.min(Math.max(parseInt(req.query.top ?? 10, 10) || 10, 1), 50);
    const recientes = Math.min(Math.max(parseInt(req.query.recientes ?? 25, 10) || 25, 1), 100);

    const [porRol] = await pool.query(
      `SELECT COALESCE(usuario_rol,'desconocido') AS rol, COUNT(*) AS eventos
         FROM audit_log
         ${whereSql}
         GROUP BY usuario_rol
         ORDER BY eventos DESC`,
      params
    );
    const [porUsuario] = await pool.query(
      `SELECT usuario_id, usuario_nombre, usuario_rol, COUNT(*) AS eventos
         FROM audit_log
         ${whereSql}
         GROUP BY usuario_id, usuario_nombre, usuario_rol
         ORDER BY eventos DESC
         LIMIT ${top}`,
      params
    );
    const [porAccion] = await pool.query(
      `SELECT accion, COUNT(*) AS eventos
         FROM audit_log
         ${whereSql}
         GROUP BY accion
         ORDER BY eventos DESC
         LIMIT ${top}`,
      params
    );
    const [porRecurso] = await pool.query(
      `SELECT recurso_tipo, COUNT(*) AS eventos
         FROM audit_log
         ${whereSql}
         GROUP BY recurso_tipo
         ORDER BY eventos DESC`,
      params
    );
    const [recientesRows] = await pool.query(
      `SELECT id, ts, usuario_id, usuario_nombre, usuario_rol,
              accion, recurso_tipo, recurso_id, descripcion
         FROM audit_log
         ${whereSql}
         ORDER BY ts DESC, id DESC
         LIMIT ${recientes}`,
      params
    );

    res.json({
      desde: req.query.desde || null,
      hasta: req.query.hasta || null,
      por_rol: porRol,
      por_usuario: porUsuario,
      por_accion: porAccion,
      por_recurso: porRecurso,
      recientes: recientesRows,
    });
  } catch (err) {
    console.error('Error generando resumen de auditoría:', err);
    res.status(500).json({ error: 'Error generando resumen' });
  }
}

/**
 * GET /api/auditoria/mio — actividad del usuario autenticado (todos los roles).
 */
async function actividadPropia(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'No autenticado' });
    const result = await listarAuditoria({
      limit: req.query.limit ?? 100,
      offset: req.query.offset,
      usuarioId: req.user.id,
      desde: req.query.desde,
      hasta: req.query.hasta,
    });
    res.json(result);
  } catch (err) {
    console.error('Error listando mi actividad:', err);
    res.status(500).json({ error: 'Error listando actividad' });
  }
}

module.exports = { listar, resumen, actividadPropia };
