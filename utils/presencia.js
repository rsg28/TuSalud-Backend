/**
 * Soft-lock de presencia colaborativa.
 *
 * El frontend manda heartbeats periódicos (`POST /api/presencia/heartbeat`)
 * mientras un usuario edita o revisa un recurso (pedido, cotización, etc).
 * Otros usuarios al abrir el mismo recurso ven un banner "Juan está editando
 * este pedido desde hace 2 min".
 *
 * Es un lock cooperativo: no bloquea físicamente la edición. La integridad
 * dura sigue garantizada por las transacciones / CAS del backend.
 *
 * Tabla: `editor_actividad` (ver migration_concurrencia_fixes_v2.sql).
 */

const pool = require('../config/database');

const HEARTBEAT_VIVO_MS = 90 * 1000;        // 1.5 min = activo
const HEARTBEAT_DEAD_MS = 30 * 60 * 1000;   // 30 min = limpiar

const RECURSOS_VALIDOS = new Set([
  'PEDIDO',
  'COTIZACION',
  'FACTURA',
  'PERFIL_EMO',
  'PRECIO_EXAMEN',
  'PEDIDO_PACIENTES',
]);

const ACCIONES_VALIDAS = new Set(['EDITAR', 'REVISAR', 'APROBAR', 'VER']);

function normRecursoTipo(t) {
  const u = String(t || '').toUpperCase();
  return RECURSOS_VALIDOS.has(u) ? u : null;
}

function normAccion(a) {
  const u = String(a || 'EDITAR').toUpperCase();
  return ACCIONES_VALIDAS.has(u) ? u : 'EDITAR';
}

/**
 * Registra/refresca el heartbeat de un usuario sobre un recurso.
 *
 * @param {object} user                    req.user
 * @param {object} params
 * @param {string} params.recurso_tipo
 * @param {string|number} params.recurso_id
 * @param {string} [params.accion='EDITAR']
 */
async function heartbeat(user, params) {
  if (!user || !user.id) throw new Error('Sin usuario autenticado');
  const recursoTipo = normRecursoTipo(params.recurso_tipo);
  if (!recursoTipo) throw new Error('recurso_tipo inválido');
  const recursoId = String(params.recurso_id ?? '').slice(0, 80);
  if (!recursoId) throw new Error('recurso_id requerido');
  const accion = normAccion(params.accion);

  await pool.execute(
    `INSERT INTO editor_actividad
       (recurso_tipo, recurso_id, usuario_id, usuario_nombre, usuario_rol, accion)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       heartbeat_at  = CURRENT_TIMESTAMP,
       usuario_nombre = VALUES(usuario_nombre),
       usuario_rol    = VALUES(usuario_rol)`,
    [
      recursoTipo,
      recursoId,
      user.id,
      user.nombre_completo || user.nombre_usuario || null,
      user.rol || null,
      accion,
    ]
  );
}

/**
 * Devuelve qué usuarios están activos en un recurso (heartbeat < 90s).
 *
 * @returns {Promise<Array>}
 */
async function listarActivos(recursoTipo, recursoId) {
  const rt = normRecursoTipo(recursoTipo);
  if (!rt) return [];
  const rid = String(recursoId ?? '').slice(0, 80);
  if (!rid) return [];

  const [rows] = await pool.execute(
    `SELECT usuario_id, usuario_nombre, usuario_rol, accion,
            heartbeat_at, started_at,
            TIMESTAMPDIFF(SECOND, heartbeat_at, NOW()) AS segundos_inactivo
       FROM editor_actividad
      WHERE recurso_tipo = ?
        AND recurso_id = ?
        AND heartbeat_at >= NOW() - INTERVAL ? SECOND
      ORDER BY heartbeat_at DESC`,
    [rt, rid, Math.floor(HEARTBEAT_VIVO_MS / 1000)]
  );
  return rows;
}

/**
 * Libera explícitamente la presencia de un usuario sobre un recurso (al
 * cerrar la pantalla, por ejemplo). Llamada idempotente.
 */
async function liberar(user, params) {
  if (!user || !user.id) return;
  const recursoTipo = normRecursoTipo(params.recurso_tipo);
  if (!recursoTipo) return;
  const recursoId = String(params.recurso_id ?? '').slice(0, 80);
  if (!recursoId) return;
  await pool.execute(
    `DELETE FROM editor_actividad
      WHERE recurso_tipo = ? AND recurso_id = ? AND usuario_id = ?`,
    [recursoTipo, recursoId, user.id]
  );
}

/**
 * Limpia rastros muy viejos para que la tabla no crezca indefinidamente.
 * Se puede llamar desde un cron o al primer heartbeat de un proceso.
 */
async function purgar() {
  try {
    await pool.execute(
      `DELETE FROM editor_actividad
        WHERE heartbeat_at < NOW() - INTERVAL ? SECOND`,
      [Math.floor(HEARTBEAT_DEAD_MS / 1000)]
    );
  } catch (err) {
    console.warn('[presencia] purgar falló:', err?.message || err);
  }
}

module.exports = {
  heartbeat,
  listarActivos,
  liberar,
  purgar,
  RECURSOS_VALIDOS,
  ACCIONES_VALIDAS,
};
