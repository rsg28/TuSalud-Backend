/**
 * Middleware de idempotencia para endpoints POST sensibles
 * (`/api/pedidos`, `/api/cotizaciones`, `/api/facturas`, ...).
 *
 * Si el cliente envía el header `Idempotency-Key`, registramos la clave en la
 * tabla `idempotency_keys` (ver `migration_concurrencia_fixes_v2.sql`). Si la
 * misma clave llega de nuevo:
 *   - Si el primer request todavía no terminó → 409 (conflict / in progress).
 *   - Si ya terminó → devolvemos el `response_status` + `response_body` cacheados,
 *     evitando crear un duplicado.
 *
 * El UNIQUE `(clave, scope, usuario_id)` garantiza que dos requests paralelos
 * con la misma clave se serializan: el primero `INSERT`s, el segundo recibe
 * `ER_DUP_ENTRY` y devolvemos el resultado cacheado / espera.
 *
 * Diseñado para no romper clientes que no envían el header: si no hay
 * `Idempotency-Key`, el middleware deja pasar la request sin tocar nada.
 */

const crypto = require('crypto');
const pool = require('../config/database');

const MAX_KEY_LEN = 120;
const RESPONSE_BODY_LIMIT = 64 * 1024; // 64 KB cacheable

function hashBody(body) {
  try {
    const txt = body && typeof body === 'object' ? JSON.stringify(body) : String(body || '');
    return crypto.createHash('sha256').update(txt).digest('hex');
  } catch (_e) {
    return null;
  }
}

/**
 * Construye el middleware para un scope concreto (ej. 'POST:/api/pedidos').
 * Le pasamos un scope explícito en vez de inferirlo de la request para que
 * `POST /api/pedidos` y `POST /api/pedidos/123/examenes` no compartan claves
 * por accidente si el cliente reusa el mismo header con otra ruta.
 *
 * @param {string} scope
 * @returns {import('express').RequestHandler}
 */
function idempotency(scope) {
  return async (req, res, next) => {
    const claveRaw = req.headers['idempotency-key'];
    if (!claveRaw) return next();
    const clave = String(claveRaw).trim().slice(0, MAX_KEY_LEN);
    if (!clave) return next();

    const usuarioId = req.user?.id ?? null;
    const requestHash = hashBody(req.body);

    let connection;
    try {
      connection = await pool.getConnection();
      // Intentamos reservar la clave: INSERT atómico apoyado en el UNIQUE
      // (clave, scope, usuario_id). Si ya existía, leemos su estado.
      try {
        await connection.execute(
          `INSERT INTO idempotency_keys
             (clave, scope, usuario_id, request_hash)
           VALUES (?, ?, ?, ?)`,
          [clave, scope, usuarioId, requestHash]
        );
        // Reservada con éxito: dejamos seguir la request. Al final del handler
        // capturamos `res.json` para guardar la respuesta.
        connection.release();
      } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') {
          // Ya existía: leer estado.
          const [rows] = await connection.execute(
            `SELECT id, completed_at, response_status, response_body_json, request_hash
               FROM idempotency_keys
              WHERE clave = ? AND scope = ?
                AND (usuario_id <=> ?)`,
            [clave, scope, usuarioId]
          );
          connection.release();
          if (rows.length === 0) return next();
          const prev = rows[0];

          // Detecta reuso indebido (mismo Idempotency-Key con payload distinto).
          if (
            requestHash &&
            prev.request_hash &&
            requestHash !== prev.request_hash
          ) {
            return res.status(409).json({
              error:
                'La clave de idempotencia ya se usó con un payload diferente. Genera una nueva clave.',
              codigo: 'IDEMPOTENCY_KEY_REUSED',
            });
          }

          if (!prev.completed_at) {
            return res.status(409).json({
              error:
                'Una operación con la misma clave de idempotencia está en curso. Reintenta en unos segundos.',
              codigo: 'IDEMPOTENCY_IN_PROGRESS',
            });
          }

          // Devolvemos la respuesta cacheada.
          let body = null;
          try {
            body = prev.response_body_json ? JSON.parse(prev.response_body_json) : null;
          } catch (_e) {
            body = null;
          }
          return res
            .status(prev.response_status || 200)
            .set('Idempotency-Replay', 'true')
            .json(body ?? { message: 'OK (cacheado por idempotencia)' });
        }
        // Otro error: no rompemos el flujo, dejamos pasar sin cache.
        console.warn('[idempotency] error registrando clave:', err?.message || err);
        try { connection.release(); } catch (_) {}
        return next();
      }
    } catch (err) {
      console.warn('[idempotency] error obteniendo conexión:', err?.message || err);
      if (connection) try { connection.release(); } catch (_) {}
      return next();
    }

    // Interceptamos `res.json` para persistir la respuesta una vez completada.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const status = res.statusCode || 200;
      let bodyJson = null;
      try {
        bodyJson = body ? JSON.stringify(body) : null;
        if (bodyJson && bodyJson.length > RESPONSE_BODY_LIMIT) {
          // No cacheamos cuerpos enormes; igual la operación ya se hizo.
          bodyJson = null;
        }
      } catch (_e) {
        bodyJson = null;
      }
      // Fire-and-forget: no esperamos al UPDATE para responder.
      pool
        .execute(
          `UPDATE idempotency_keys
             SET completed_at = NOW(),
                 response_status = ?,
                 response_body_json = ?
           WHERE clave = ? AND scope = ?
             AND (usuario_id <=> ?)`,
          [status, bodyJson, clave, scope, usuarioId]
        )
        .catch((e) => console.warn('[idempotency] no se pudo cachear respuesta:', e?.message));
      return originalJson(body);
    };

    return next();
  };
}

module.exports = idempotency;
