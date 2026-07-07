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

module.exports = {
  listarMisArchivos,
  subirMiArchivo,
  generarUrlDescarga,
  eliminarMiArchivo,
};
