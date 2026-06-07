/**
 * Helper de auditoría centralizada.
 *
 * Registra acciones significativas en `audit_log` (ver
 * `migration_concurrencia_fixes_v2.sql`). Todas las llamadas son best-effort:
 * un fallo del registro NUNCA debe abortar la operación principal, así que
 * cualquier error queda en `console.warn` y se sigue adelante.
 *
 * Si el caller pasa una `connection` transaccional, escribimos dentro de ella
 * para que la auditoría se haga rollback junto con la operación principal si
 * algo falla. Si no, usamos el pool global.
 */

const pool = require('../config/database');

const MAX_DESC_LEN = 1500;

function safeStringify(obj) {
  try {
    return obj == null ? null : JSON.stringify(obj);
  } catch (_e) {
    return null;
  }
}

/**
 * Registra una entrada en `audit_log`.
 *
 * @param {object} req       Express request (para extraer usuario, IP, UA).
 * @param {object} evento
 * @param {string} evento.accion         Verbo en mayúsculas (CREAR_PEDIDO, APROBAR_COTIZACION, ...).
 * @param {string} evento.recurso_tipo   PEDIDO | COTIZACION | FACTURA | PRECIO_EXAMEN | ...
 * @param {string|number|null} [evento.recurso_id]
 * @param {string} [evento.descripcion]  Texto humano para mostrar en la UI.
 * @param {object} [evento.detalle]      Snapshot opcional del antes/después.
 * @param {object} [exec]                Connection transaccional o pool. Default: pool.
 * @returns {Promise<void>}
 */
async function registrarAuditoria(req, evento, exec) {
  const runner = exec && typeof exec.execute === 'function' ? exec : pool;
  try {
    const user = req?.user || {};
    const ip =
      (req?.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) ||
      req?.ip ||
      req?.connection?.remoteAddress ||
      null;
    const ua = req?.headers?.['user-agent'] || null;
    const requestId =
      req?.headers?.['idempotency-key'] || req?.headers?.['x-request-id'] || null;
    const recursoId =
      evento.recurso_id == null
        ? null
        : String(evento.recurso_id).slice(0, 80);
    const descripcion = evento.descripcion
      ? String(evento.descripcion).slice(0, MAX_DESC_LEN)
      : null;
    const detalleJson = evento.detalle ? safeStringify(evento.detalle) : null;

    await runner.execute(
      `INSERT INTO audit_log
         (usuario_id, usuario_nombre, usuario_rol, accion, recurso_tipo, recurso_id,
          descripcion, detalle_json, ip, user_agent, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id ?? null,
        user.nombre_completo ?? user.nombre_usuario ?? null,
        user.rol ?? null,
        String(evento.accion || 'DESCONOCIDA').slice(0, 80),
        String(evento.recurso_tipo || 'OTRO').slice(0, 40),
        recursoId,
        descripcion,
        detalleJson,
        ip ? String(ip).slice(0, 64) : null,
        ua ? String(ua).slice(0, 255) : null,
        requestId ? String(requestId).slice(0, 80) : null,
      ]
    );
  } catch (err) {
    console.warn('[audit] no se pudo registrar evento:', err?.message || err);
  }
}

/**
 * Lista entradas de `audit_log` filtrables. Pensada para el endpoint
 * `/api/auditoria` (controller).
 *
 * @param {object} filtros
 * @param {number} [filtros.limit=50]
 * @param {number} [filtros.offset=0]
 * @param {number} [filtros.usuarioId]
 * @param {string} [filtros.rol]
 * @param {string} [filtros.accion]
 * @param {string} [filtros.recursoTipo]
 * @param {string} [filtros.recursoId]
 * @param {string} [filtros.desde]   ISO date / datetime
 * @param {string} [filtros.hasta]   ISO date / datetime
 * @returns {Promise<{total:number, rows:object[]}>}
 */
async function listarAuditoria(filtros = {}) {
  const where = [];
  const params = [];
  if (filtros.usuarioId != null) {
    where.push('usuario_id = ?');
    params.push(Number(filtros.usuarioId));
  }
  if (filtros.rol) {
    where.push('usuario_rol = ?');
    params.push(String(filtros.rol).toLowerCase());
  }
  if (filtros.accion) {
    where.push('accion = ?');
    params.push(String(filtros.accion).toUpperCase());
  }
  if (filtros.recursoTipo) {
    where.push('recurso_tipo = ?');
    params.push(String(filtros.recursoTipo).toUpperCase());
  }
  if (filtros.recursoId) {
    where.push('recurso_id = ?');
    params.push(String(filtros.recursoId));
  }
  if (filtros.desde) {
    where.push('ts >= ?');
    params.push(filtros.desde);
  }
  if (filtros.hasta) {
    where.push('ts <= ?');
    params.push(filtros.hasta);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(Math.max(parseInt(filtros.limit ?? 50, 10) || 50, 1), 500);
  const offset = Math.max(parseInt(filtros.offset ?? 0, 10) || 0, 0);

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_log ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT id, ts, usuario_id, usuario_nombre, usuario_rol, accion,
            recurso_tipo, recurso_id, descripcion, detalle_json,
            ip, user_agent, request_id
       FROM audit_log
       ${whereSql}
       ORDER BY ts DESC, id DESC
       LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  return { total: Number(total) || 0, rows };
}

module.exports = {
  registrarAuditoria,
  listarAuditoria,
};
