/**
 * TuSalud — Controlador de "Mis archivos de cotizaciones".
 *
 * Estos archivos son un archivador personal por usuario (típicamente
 * vendedor / manager) donde se guardan PDFs / Excels de cotizaciones que
 * comparten con clientes. NO hay auditoría ni verificación de contenido:
 * lo único que hace el sistema es guardar el archivo tal cual y ofrecer
 * descarga y borrado.
 *
 * Estructura de key en S3:
 *   `${rol}/${email}/cotizaciones/${nombre_del_archivo}`
 *
 * Ejemplo:
 *   `vendedor/juan.perez@tusalud.com/cotizaciones/Cotizacion-ACME-2026-01.xlsx`
 *
 * Todas las rutas usan el usuario autenticado (`req.user`) — un usuario
 * nunca puede leer, subir ni borrar en la carpeta de otro.
 */

const s3 = require('../utils/s3');
const chunkSessions = require('../utils/misArchivosUploadSessions');

const ROLES_VALIDOS = new Set(['manager', 'vendedor', 'cliente']);

/**
 * Sanitiza un nombre de archivo eliminando separadores y caracteres de control.
 * Preserva mayúsculas/minúsculas, espacios, acentos y paréntesis para que el
 * usuario reconozca sus archivos.
 */
function sanitizarNombreArchivo(nombre) {
  const s = String(nombre || '').trim();
  if (!s) return null;
  const limpio = s
    .replace(/[/\\]+/g, '_')
    .replace(/[\u0000-\u001f]+/g, '')
    .replace(/^\.+/, '')
    .slice(0, 200);
  return limpio || null;
}

/**
 * Sanitiza el correo para usarlo como segmento de key. S3 permite `@` y `.`,
 * así que solo bajamos a minúsculas y quitamos caracteres realmente conflictivos.
 */
function sanitizarSegmentoEmail(email) {
  const raw = String(email || '').trim().toLowerCase();
  if (!raw) return null;
  return raw.replace(/[/\\?*"<>|:]+/g, '_').slice(0, 200);
}

function construirPrefijoUsuario(user) {
  const rol = String(user?.rol || '').trim().toLowerCase();
  if (!ROLES_VALIDOS.has(rol)) return null;
  const emailSeg = sanitizarSegmentoEmail(user?.email);
  if (!emailSeg) return null;
  return `${rol}/${emailSeg}/cotizaciones/`;
}

function construirKey(user, nombreArchivo) {
  const prefijo = construirPrefijoUsuario(user);
  if (!prefijo) return null;
  const nombre = sanitizarNombreArchivo(nombreArchivo);
  if (!nombre) return null;
  return prefijo + nombre;
}

/**
 * Decodifica el nombre del archivo desde el body/query, tolerando el nombre en
 * distintos campos por comodidad (`nombre`, `nombre_archivo`, `filename`, `file_name`).
 */
function obtenerNombreDeReq(req) {
  const candidatos = [
    req.body?.nombre,
    req.body?.nombre_archivo,
    req.body?.filename,
    req.body?.file_name,
    req.query?.nombre,
  ];
  for (const c of candidatos) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

function ensureS3(res) {
  if (!s3.isEnabled()) {
    res.status(503).json({
      error:
        'El almacenamiento en la nube (S3) no está configurado en este servidor. Contacte al administrador.',
    });
    return false;
  }
  return true;
}

/**
 * GET /api/mis-archivos-cotizaciones
 *   → { files: [{ nombre, tamano, subido_at, key }] }
 */
async function listarMisArchivos(req, res) {
  if (!ensureS3(res)) return;
  try {
    const prefijo = construirPrefijoUsuario(req.user);
    if (!prefijo) {
      return res.status(400).json({ error: 'Usuario sin rol o correo válidos.' });
    }
    const objs = await s3.listObjectsUnderPrefix(prefijo);
    const files = objs
      .map((o) => ({
        nombre: o.key.slice(prefijo.length),
        tamano: o.size,
        subido_at: o.lastModified,
        key: o.key,
      }))
      .filter((f) => f.nombre && !f.nombre.endsWith('/'))
      .sort((a, b) => {
        const ta = a.subido_at ? Date.parse(a.subido_at) : 0;
        const tb = b.subido_at ? Date.parse(b.subido_at) : 0;
        return tb - ta;
      });
    return res.json({ files, prefijo });
  } catch (err) {
    console.error('[mis-archivos] listar error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudieron listar los archivos.' });
  }
}

/**
 * POST /api/mis-archivos-cotizaciones
 * Body JSON: { nombre, file_base64, mime_type? }
 *   → { ok: true, nombre, tamano }
 *
 * No se verifica el contenido — se guarda tal cual llegue. Si el nombre ya
 * existe, se sobrescribe (el usuario probablemente subió una versión nueva).
 */
async function subirMiArchivo(req, res) {
  if (!ensureS3(res)) return;
  try {
    const nombreInput = obtenerNombreDeReq(req);
    const nombre = sanitizarNombreArchivo(nombreInput);
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de archivo requerido.' });
    }

    const raw = typeof req.body?.file_base64 === 'string' ? req.body.file_base64 : '';
    if (!raw.trim()) {
      return res.status(400).json({ error: 'Contenido del archivo (file_base64) requerido.' });
    }
    let buffer;
    try {
      buffer = Buffer.from(raw.replace(/\s/g, ''), 'base64');
    } catch {
      return res.status(400).json({ error: 'file_base64 no es un base64 válido.' });
    }
    if (!buffer.length) {
      return res.status(400).json({ error: 'El archivo está vacío.' });
    }
    const MAX_MB = parseInt(process.env.MIS_ARCHIVOS_MAX_MB || '25', 10);
    if (buffer.length > MAX_MB * 1024 * 1024) {
      return res.status(400).json({ error: `El archivo supera el tamaño máximo (${MAX_MB} MB).` });
    }

    const key = construirKey(req.user, nombre);
    if (!key) {
      return res.status(400).json({ error: 'Usuario sin rol o correo válidos.' });
    }
    const contentType = String(req.body?.mime_type || 'application/octet-stream')
      .toLowerCase()
      .slice(0, 150);
    const result = await s3.putObjectAtKey(buffer, key, {
      contentType,
      metadata: {
        usuario_id: String(req.user?.id ?? ''),
        usuario_email: String(req.user?.email ?? ''),
        usuario_rol: String(req.user?.rol ?? ''),
        nombre_original: nombre.slice(0, 200),
      },
    });
    return res.json({
      ok: true,
      nombre,
      tamano: result.size,
      key: result.key,
    });
  } catch (err) {
    console.error('[mis-archivos] subir error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudo guardar el archivo.' });
  }
}

/**
 * POST /api/mis-archivos-cotizaciones/descargar
 * Body JSON: { nombre }
 *   → { url, expira_en }
 */
async function generarUrlDescarga(req, res) {
  if (!ensureS3(res)) return;
  try {
    const nombre = sanitizarNombreArchivo(obtenerNombreDeReq(req));
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de archivo requerido.' });
    }
    const key = construirKey(req.user, nombre);
    if (!key) {
      return res.status(400).json({ error: 'Usuario sin rol o correo válidos.' });
    }
    const existe = await s3.objectExists(key);
    if (!existe) {
      return res.status(404).json({ error: 'Archivo no encontrado.' });
    }
    const expiresSeconds = 600;
    const url = await s3.getPresignedDownloadUrl(key, { expiresSeconds });
    return res.json({ url, expira_en: expiresSeconds });
  } catch (err) {
    console.error('[mis-archivos] descarga error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudo generar el enlace de descarga.' });
  }
}

/**
 * DELETE /api/mis-archivos-cotizaciones
 * Body JSON o query: { nombre }
 *   → { ok: true }
 */
async function eliminarMiArchivo(req, res) {
  if (!ensureS3(res)) return;
  try {
    const nombre = sanitizarNombreArchivo(obtenerNombreDeReq(req));
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de archivo requerido.' });
    }
    const key = construirKey(req.user, nombre);
    if (!key) {
      return res.status(400).json({ error: 'Usuario sin rol o correo válidos.' });
    }
    await s3.deleteObjectByKey(key);
    return res.json({ ok: true, nombre });
  } catch (err) {
    console.error('[mis-archivos] eliminar error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudo eliminar el archivo.' });
  }
}

/**
 * POST /api/mis-archivos-cotizaciones/upload/init
 * Body: { nombre, total_chunks, mime_type?, total_bytes? }
 *   → { upload_id, total_chunks }
 *
 * Inicia una sesión de subida por chunks. Ideal para archivos grandes que
 * Fortinet u otros firewalls corporativos suelen bloquear en un único POST.
 */
async function iniciarSubidaPorChunks(req, res) {
  if (!ensureS3(res)) return;
  try {
    const nombreInput = obtenerNombreDeReq(req);
    const nombre = sanitizarNombreArchivo(nombreInput);
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de archivo requerido.' });
    }
    // Verificamos que el usuario tenga rol/email válidos ANTES de crear la
    // sesión (evita gastar memoria si el complete iba a fallar igual).
    const prefijo = construirPrefijoUsuario(req.user);
    if (!prefijo) {
      return res.status(400).json({ error: 'Usuario sin rol o correo válidos.' });
    }
    const totalChunks = req.body?.total_chunks ?? req.body?.totalChunks;
    if (totalChunks == null) {
      return res.status(400).json({ error: 'total_chunks es requerido' });
    }
    const contentType = req.body?.mime_type ?? req.body?.mimeType ?? 'application/octet-stream';
    const totalBytes = req.body?.total_bytes ?? req.body?.totalBytes ?? null;

    const out = chunkSessions.createSession(req.user.id, {
      nombre,
      totalChunks,
      contentType,
      totalBytes,
    });
    return res.json({
      upload_id: out.uploadId,
      uploadId: out.uploadId,
      total_chunks: out.totalChunks,
    });
  } catch (err) {
    console.error('[mis-archivos] init-chunk error:', err?.message || err);
    return res.status(400).json({ error: err?.message || 'No se pudo iniciar la subida' });
  }
}

/**
 * POST /api/mis-archivos-cotizaciones/upload/chunk
 * Body: { upload_id, index, total, chunk_base64 }
 *   → { received, total, complete }
 */
async function recibirChunk(req, res) {
  try {
    const uploadId = req.body?.upload_id ?? req.body?.uploadId;
    const index = req.body?.index ?? req.body?.chunk_index;
    const total = req.body?.total ?? req.body?.total_chunks;
    const chunkBase64 = req.body?.chunk_base64 ?? req.body?.chunkBase64;
    if (!uploadId || index == null || total == null || !chunkBase64) {
      return res.status(400).json({
        error: 'upload_id, index, total y chunk_base64 son requeridos',
      });
    }
    const out = chunkSessions.putChunk(req.user.id, {
      uploadId: String(uploadId),
      index,
      total,
      chunkBase64,
    });
    return res.json(out);
  } catch (err) {
    const msg = err?.message || 'Error al recibir chunk';
    const code = /no encontrada|expirada|autorizado/i.test(msg) ? 404 : 400;
    if (code >= 500 || /supera el tamaño/i.test(msg)) {
      console.warn('[mis-archivos] chunk error:', msg);
    }
    return res.status(code).json({ error: msg });
  }
}

/**
 * POST /api/mis-archivos-cotizaciones/upload/complete
 * Body: { upload_id }
 *   → { ok, nombre, tamano, key }
 *
 * Ensambla los chunks y sube el archivo a S3 en la carpeta del usuario.
 */
async function completarSubidaPorChunks(req, res) {
  if (!ensureS3(res)) return;
  try {
    const uploadId = req.body?.upload_id ?? req.body?.uploadId;
    if (!uploadId) {
      return res.status(400).json({ error: 'upload_id es requerido' });
    }
    const buildKey = (nombre) => construirKey(req.user, nombre);
    const result = await chunkSessions.completeToS3(
      req.user.id,
      String(uploadId),
      buildKey,
      { id: req.user?.id, email: req.user?.email, rol: req.user?.rol }
    );
    return res.json({
      ok: true,
      nombre: result.nombre,
      tamano: result.tamano,
      key: result.key,
    });
  } catch (err) {
    const msg = err?.message || 'No se pudo completar la subida';
    const code = /no encontrada|expirada|autorizado/i.test(msg)
      ? 404
      : /supera el tamaño|inválid|faltan chunks/i.test(msg)
        ? 400
        : 500;
    if (code >= 500) console.error('[mis-archivos] complete-chunk error:', msg);
    else console.warn('[mis-archivos] complete-chunk aviso:', msg);
    return res.status(code).json({ error: msg });
  }
}

module.exports = {
  listarMisArchivos,
  subirMiArchivo,
  generarUrlDescarga,
  eliminarMiArchivo,
  iniciarSubidaPorChunks,
  recibirChunk,
  completarSubidaPorChunks,
};
