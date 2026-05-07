/**
 * TuSalud — Middleware de respaldo en S3 + auditoría en BD.
 *
 * Idea: cualquier endpoint que recibe un archivo del usuario debe registrarlo
 * en `archivos_subidos` y, si el bucket S3 está configurado, subir el original
 * tal cual llegó. Esto nos protege cuando el cliente alega haber subido algo
 * distinto a lo que el sistema procesó (auditoría) o cuando queremos
 * reprocesar un archivo con lógica nueva (forense).
 *
 * Diseño:
 *   - Es un middleware Express. Se monta DESPUÉS del parser que pone el
 *     archivo en `req.file` o `req.body.file_base64` (multer / express.json).
 *   - Construye `req.uploadAudit` con info útil (id de fila, sha256, key S3),
 *     que el controlador puede leer y, si corresponde, vincular a una
 *     cotización/pedido específico llamando a `linkUploadAudit(...)`.
 *   - Es tolerante a fallos: si S3 está caído, registra `estado='ERROR_S3'`
 *     pero NO bloquea la operación principal — el cliente sigue viendo su
 *     PDF parseado.
 *   - No bloquea la respuesta: el upload a S3 corre en paralelo al parseo;
 *     se actualiza la fila con el resultado cuando S3 termina.
 */

const pool = require('../config/database');
const s3 = require('../utils/s3');

/**
 * Lee el archivo que dejó el parser previo (multer / express.json) y devuelve
 * un objeto homogéneo o null si no había archivo en la request.
 */
function extraerArchivoDeRequest(req) {
  if (req.file && Buffer.isBuffer(req.file.buffer) && req.file.buffer.length > 0) {
    return {
      buffer: req.file.buffer,
      mimeType: (req.file.mimetype || '').toLowerCase() || null,
      nombreOriginal: req.file.originalname || null,
    };
  }
  if (req.body && typeof req.body.file_base64 === 'string' && req.body.file_base64.trim()) {
    const raw = req.body.file_base64.replace(/\s/g, '');
    let buffer;
    try {
      buffer = Buffer.from(raw, 'base64');
    } catch {
      return null;
    }
    if (!buffer.length) return null;
    return {
      buffer,
      mimeType:
        (req.body.file_mime_type || req.body.file_mimetype || req.body.file_mime || '').toLowerCase() ||
        null,
      nombreOriginal: req.body.file_name || req.body.file_original_name || null,
    };
  }
  return null;
}

/** Inserta la fila `archivos_subidos` en estado PENDIENTE y devuelve su id. */
async function crearRegistroAuditoria(req, archivo, fuente) {
  const usuarioId = req.user?.id ?? null;
  const usuarioNombre = req.user?.nombre_completo ?? req.user?.nombre_usuario ?? null;
  const usuarioRol = req.user?.rol ?? null;
  const sha = s3.sha256Hex(archivo.buffer);
  const tamano = archivo.buffer.length;

  const [res] = await pool.execute(
    `INSERT INTO archivos_subidos (
       usuario_id, usuario_nombre, usuario_rol, fuente,
       nombre_original, mime_type, tamano_bytes, sha256_hex,
       estado
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuarioId,
      usuarioNombre,
      usuarioRol,
      String(fuente || 'desconocida').slice(0, 80),
      archivo.nombreOriginal ? String(archivo.nombreOriginal).slice(0, 500) : null,
      archivo.mimeType ? String(archivo.mimeType).slice(0, 150) : null,
      tamano,
      sha,
      'PENDIENTE',
    ]
  );
  return { id: res.insertId, sha, tamano };
}

/** Actualiza la fila con el resultado del upload a S3. */
async function actualizarRegistroExitoso(id, s3Result) {
  await pool.execute(
    `UPDATE archivos_subidos
        SET estado = 'SUBIDO',
            s3_bucket = ?,
            s3_key = ?,
            s3_region = ?,
            s3_etag = ?,
            s3_version_id = ?,
            error_mensaje = NULL,
            subido_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [
      s3Result.bucket || null,
      s3Result.key || null,
      s3Result.region || null,
      s3Result.etag || null,
      s3Result.versionId || null,
      id,
    ]
  );
}

async function actualizarRegistroError(id, errMsg) {
  try {
    await pool.execute(
      `UPDATE archivos_subidos
          SET estado = 'ERROR_S3',
              error_mensaje = ?
        WHERE id = ?`,
      [String(errMsg || 'error desconocido').slice(0, 500), id]
    );
  } catch (e) {
    console.warn('[upload-audit] no se pudo registrar error S3:', e?.message);
  }
}

/**
 * Devuelve un middleware Express que:
 *   1. Inserta una fila en archivos_subidos (estado PENDIENTE).
 *   2. Lanza el upload a S3 en background.
 *   3. Adjunta `req.uploadAudit = { id, sha256, size, fuente }` para que el
 *      controlador pueda leerlo y vincularlo a entidades de negocio.
 *
 * No detiene el flujo si falla (auditoría es best-effort).
 *
 * @param {string} fuente  identificador funcional del endpoint
 *                         (ej. 'import.pdf-perfil-tablas').
 */
function auditarUploadMiddleware(fuente) {
  return async function auditUploadMw(req, res, next) {
    try {
      const archivo = extraerArchivoDeRequest(req);
      if (!archivo) return next();

      let registro;
      try {
        registro = await crearRegistroAuditoria(req, archivo, fuente);
      } catch (err) {
        // Si la BD falla, seguimos sin auditar (no romper el flujo).
        console.warn('[upload-audit] fallo al crear fila:', err?.message);
        return next();
      }

      req.uploadAudit = {
        id: registro.id,
        sha256: registro.sha,
        size: registro.tamano,
        fuente,
        nombreOriginal: archivo.nombreOriginal,
        mimeType: archivo.mimeType,
      };

      // Subida a S3 en background (no bloquea la respuesta).
      if (s3.isEnabled()) {
        s3.uploadBuffer(archivo.buffer, {
          keyHint: `${fuente}/${archivo.nombreOriginal || 'archivo'}`,
          contentType: archivo.mimeType || 'application/octet-stream',
          metadata: {
            usuario_id: String(req.user?.id ?? ''),
            fuente: String(fuente || ''),
          },
        })
          .then((r) => actualizarRegistroExitoso(registro.id, r))
          .catch((err) => actualizarRegistroError(registro.id, err?.message || String(err)));
      } else {
        // Sin S3 configurado: dejamos la fila como ERROR_S3 con un mensaje claro
        // (igual queda registro local con sha256 + tamaño).
        actualizarRegistroError(
          registro.id,
          'S3 no configurado (AWS_S3_BUCKET / AWS_REGION ausentes); fila creada sin respaldo binario.'
        ).catch(() => {});
      }
    } catch (err) {
      console.warn('[upload-audit] error inesperado:', err?.message);
    }
    return next();
  };
}

/**
 * Vincula un registro de auditoría existente (creado por el middleware) a una
 * entidad de negocio una vez que el controlador la conoce. Es una operación
 * idempotente: si la fila ya tenía pedido_id/cotizacion_id/empresa_id,
 * los valores no nulos pasados sobreescriben los anteriores.
 *
 * @param {number|null|undefined} archivoId  req.uploadAudit?.id
 * @param {{pedido_id?:number, cotizacion_id?:number, empresa_id?:number}} ctx
 */
async function linkUploadAudit(archivoId, ctx = {}) {
  if (!archivoId) return;
  const sets = [];
  const vals = [];
  if (ctx.pedido_id != null) { sets.push('pedido_id = ?'); vals.push(Number(ctx.pedido_id)); }
  if (ctx.cotizacion_id != null) { sets.push('cotizacion_id = ?'); vals.push(Number(ctx.cotizacion_id)); }
  if (ctx.empresa_id != null) { sets.push('empresa_id = ?'); vals.push(Number(ctx.empresa_id)); }
  if (sets.length === 0) return;
  vals.push(archivoId);
  try {
    await pool.execute(`UPDATE archivos_subidos SET ${sets.join(', ')} WHERE id = ?`, vals);
  } catch (e) {
    console.warn('[upload-audit] no se pudo vincular contexto:', e?.message);
  }
}

module.exports = {
  auditarUploadMiddleware,
  linkUploadAudit,
};
