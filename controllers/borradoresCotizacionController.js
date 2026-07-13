/**
 * TuSalud — Borradores de cotización (pre-cotización sin pedido).
 *
 * Un vendedor sube un archivo (PDF/Excel) que contiene una cotización de un
 * cliente. Se guarda en S3 como "borrador" SIN vincularlo aún a un pedido.
 * Cuando el vendedor decide adjuntarlo a un pedido, el sistema:
 *   1) valida que TODOS los perfiles y exámenes del parseo estén resueltos
 *      contra la base de datos (perfil_id / examen_id presentes en cada item);
 *   2) crea la cotización real en `cotizaciones` como BORRADOR, vinculada al
 *      pedido elegido, con los items ya resueltos y precios del archivo.
 *   3) enlaza el archivo original a la cotización creada (metadata en S3).
 *
 * Estructura en S3:
 *   {rol}/{email}/borradores-cotizacion/{brd_id}/
 *     ├── original.{ext}
 *     └── parseo.json
 *
 * El JSON de parseo se calcula en el cliente (reutiliza el pipeline probado
 * de importación de protocolos + matching contra `/api/emo-perfiles/resolve`
 * y `/api/precios/buscar`). Aquí solo se persiste, se lee y se valida.
 */

const pool = require('../config/database');
const s3 = require('../utils/s3');
const chunkSessions = require('../utils/borradoresCotizacionSessions');

const ROLES_VALIDOS = new Set(['manager', 'vendedor']);
const MAX_PARSEO_BYTES = 512 * 1024; // 512 KB de JSON: suficiente para docenas de perfiles

/* -------------------------------------------------------------------------- */
/* Helpers de key S3                                                          */
/* -------------------------------------------------------------------------- */

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
  return `${rol}/${emailSeg}/borradores-cotizacion/`;
}

/** `{prefijo}{brdId}/{relativo}` con validación básica de brd_id. */
function construirKeyBorrador(user, brdId, relativo) {
  const prefijo = construirPrefijoUsuario(user);
  if (!prefijo) return null;
  if (!/^brd_[a-f0-9]{16,32}$/i.test(String(brdId || ''))) return null;
  const rel = String(relativo || '').replace(/^\/+/, '').slice(0, 200);
  if (!rel) return null;
  return `${prefijo}${brdId}/${rel}`;
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

/* -------------------------------------------------------------------------- */
/* Helpers de S3: leer objeto como buffer / JSON                              */
/* -------------------------------------------------------------------------- */

/**
 * Descarga un objeto de S3 y devuelve el Buffer. Devuelve `null` si el
 * objeto no existe o no se pudo leer.
 * (S3 no expone getObject "raw" en `utils/s3`, así que lo implementamos aquí
 * usando el SDK cargado perezosamente igual que ese módulo.)
 */
async function getObjectBufferOrNull(key) {
  try {
    const aws = require('@aws-sdk/client-s3');
    const region = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || '').trim();
    const bucket = (process.env.AWS_S3_BUCKET || '').trim();
    if (!region || !bucket) return null;
    const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
    const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();
    const cfg = { region };
    if (accessKeyId && secretAccessKey) cfg.credentials = { accessKeyId, secretAccessKey };
    const client = new aws.S3Client(cfg);
    const cmd = new aws.GetObjectCommand({ Bucket: bucket, Key: key });
    const out = await client.send(cmd);
    const body = out?.Body;
    if (!body) return null;
    // Convertimos el stream a Buffer.
    const chunks = [];
    for await (const chunk of body) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

async function readParseoJson(user, brdId) {
  const key = construirKeyBorrador(user, brdId, 'parseo.json');
  if (!key) return null;
  const buf = await getObjectBufferOrNull(key);
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Validación del parseo                                                      */
/* -------------------------------------------------------------------------- */

const TIPOS_EMO_VALIDOS = new Set(['PREOC', 'ANUAL', 'RETIRO', 'VISITA']);

/**
 * Valida el shape mínimo del parseo enviado por el cliente. Rechaza campos
 * peligrosos y normaliza los que persistiremos.
 */
function normalizeParseo(rawJson, meta) {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('parseo inválido');
  }
  const items = Array.isArray(rawJson.items) ? rawJson.items : [];
  const itemsNorm = items.map((it, idx) => {
    if (!it || typeof it !== 'object') {
      throw new Error(`item[${idx}] inválido`);
    }
    const tipo = String(it.tipo_item || '').toUpperCase();
    if (tipo !== 'PERFIL' && tipo !== 'EXAMEN') {
      throw new Error(`item[${idx}].tipo_item debe ser PERFIL o EXAMEN`);
    }
    const cantidad = Math.max(1, Math.trunc(Number(it.cantidad) || 1));
    const precio_archivo = Number.isFinite(Number(it.precio_archivo))
      ? Math.max(0, Number(it.precio_archivo))
      : 0;
    const matched = Boolean(it.matched);
    const base = {
      tipo_item: tipo,
      nombre_archivo: String(it.nombre_archivo || '').slice(0, 300),
      cantidad,
      precio_archivo,
      matched,
    };
    if (tipo === 'PERFIL') {
      const tipoEmo = it.tipo_emo ? String(it.tipo_emo).toUpperCase() : null;
      if (tipoEmo && !TIPOS_EMO_VALIDOS.has(tipoEmo)) {
        throw new Error(`item[${idx}].tipo_emo inválido`);
      }
      return {
        ...base,
        tipo_emo: tipoEmo,
        perfil_id: matched && it.perfil_id != null ? Number(it.perfil_id) || null : null,
        nombre_bd: it.nombre_bd ? String(it.nombre_bd).slice(0, 300) : null,
        examenes: Array.isArray(it.examenes)
          ? it.examenes.slice(0, 200).map((ex) => ({
              nombre_archivo: String(ex.nombre_archivo || '').slice(0, 300),
              precio_archivo: Number.isFinite(Number(ex.precio_archivo))
                ? Math.max(0, Number(ex.precio_archivo))
                : 0,
              matched: Boolean(ex.matched),
              examen_id:
                ex.matched && ex.examen_id != null ? Number(ex.examen_id) || null : null,
              nombre_bd: ex.nombre_bd ? String(ex.nombre_bd).slice(0, 300) : null,
            }))
          : [],
      };
    }
    // EXAMEN
    return {
      ...base,
      examen_id: matched && it.examen_id != null ? Number(it.examen_id) || null : null,
      nombre_bd: it.nombre_bd ? String(it.nombre_bd).slice(0, 300) : null,
    };
  });

  // Resumen (recomputado para no confiar en lo que mande el cliente).
  const perfilesTotal = itemsNorm.filter((x) => x.tipo_item === 'PERFIL').length;
  const perfilesMatched = itemsNorm.filter(
    (x) => x.tipo_item === 'PERFIL' && x.matched && x.perfil_id
  ).length;
  const examenesTotal = itemsNorm.filter((x) => x.tipo_item === 'EXAMEN').length;
  const examenesMatched = itemsNorm.filter(
    (x) => x.tipo_item === 'EXAMEN' && x.matched && x.examen_id
  ).length;
  const perfilesUnmatched = itemsNorm
    .filter((x) => x.tipo_item === 'PERFIL' && (!x.matched || !x.perfil_id))
    .map((x) => x.nombre_archivo);
  const examenesUnmatched = itemsNorm
    .filter((x) => x.tipo_item === 'EXAMEN' && (!x.matched || !x.examen_id))
    .map((x) => x.nombre_archivo);
  // También deben estar vinculados todos los exámenes internos de cada perfil.
  let examenesInternosOk = true;
  for (const it of itemsNorm) {
    if (it.tipo_item !== 'PERFIL') continue;
    for (const ex of it.examenes || []) {
      if (!ex.matched || !ex.examen_id) {
        examenesInternosOk = false;
        break;
      }
    }
    if (!examenesInternosOk) break;
  }
  // Requerimos AL MENOS un ítem (perfil o examen) para permitir adjuntar.
  const hayItems = perfilesTotal + examenesTotal > 0;
  const puede_adjuntar =
    hayItems &&
    perfilesUnmatched.length === 0 &&
    examenesUnmatched.length === 0 &&
    examenesInternosOk;

  return {
    version: 1,
    id: meta.brdId,
    nombre_archivo: meta.nombre_archivo || rawJson.nombre_archivo || 'archivo',
    mime_type: meta.mime_type || rawJson.mime_type || 'application/octet-stream',
    tamano_bytes: Number(meta.tamano_bytes || rawJson.tamano_bytes || 0) || 0,
    s3_key_original: meta.s3_key_original || rawJson.s3_key_original || null,
    subido_at: meta.subido_at || rawJson.subido_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    resumen: {
      perfiles_total: perfilesTotal,
      perfiles_matched: perfilesMatched,
      perfiles_unmatched_nombres: perfilesUnmatched,
      examenes_total: examenesTotal,
      examenes_matched: examenesMatched,
      examenes_unmatched_nombres: examenesUnmatched,
      puede_adjuntar,
    },
    items: itemsNorm,
  };
}

async function guardarParseoEnS3(user, parseoNormalizado) {
  const key = construirKeyBorrador(user, parseoNormalizado.id, 'parseo.json');
  if (!key) throw new Error('No se pudo construir la key del parseo');
  const body = Buffer.from(JSON.stringify(parseoNormalizado), 'utf8');
  if (body.length > MAX_PARSEO_BYTES) {
    throw new Error('El parseo excede el tamaño máximo permitido');
  }
  await s3.putObjectAtKey(body, key, {
    contentType: 'application/json',
    metadata: {
      usuario_id: String(user?.id ?? ''),
      usuario_email: String(user?.email ?? ''),
      usuario_rol: String(user?.rol ?? ''),
      borrador_id: parseoNormalizado.id,
      puede_adjuntar: parseoNormalizado.resumen.puede_adjuntar ? '1' : '0',
    },
  });
  return key;
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

/** POST /upload/init — inicia sesión de subida chunked del archivo original. */
async function iniciarSubida(req, res) {
  if (!ensureS3(res)) return;
  try {
    const prefijo = construirPrefijoUsuario(req.user);
    if (!prefijo) return res.status(400).json({ error: 'Usuario sin rol o correo válidos.' });

    const nombre = req.body?.nombre ?? req.body?.file_name ?? null;
    const totalChunks = req.body?.total_chunks ?? req.body?.totalChunks;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
    if (totalChunks == null) return res.status(400).json({ error: 'total_chunks es requerido' });

    const out = chunkSessions.createSession(req.user.id, {
      nombre,
      totalChunks,
      contentType: req.body?.mime_type ?? req.body?.mimeType ?? 'application/octet-stream',
      totalBytes: req.body?.total_bytes ?? req.body?.totalBytes ?? null,
    });
    return res.json({
      upload_id: out.uploadId,
      uploadId: out.uploadId,
      total_chunks: out.totalChunks,
    });
  } catch (err) {
    console.error('[borradores-cotizacion] init error:', err?.message || err);
    return res.status(400).json({ error: err?.message || 'No se pudo iniciar la subida' });
  }
}

/** POST /upload/chunk */
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
    return res.status(code).json({ error: msg });
  }
}

/**
 * POST /upload/complete
 * Body opcional: { parseo: {...} } — si viene, se guarda tras subir el original.
 * Devuelve `{ brd_id, nombre, tamano, key, parseo? }`.
 */
async function completarSubida(req, res) {
  if (!ensureS3(res)) return;
  try {
    const uploadId = req.body?.upload_id ?? req.body?.uploadId;
    if (!uploadId) return res.status(400).json({ error: 'upload_id es requerido' });

    const buildKey = (brdId, rel) => construirKeyBorrador(req.user, brdId, rel);
    const uploaded = await chunkSessions.completeToS3(
      req.user.id,
      String(uploadId),
      buildKey,
      { id: req.user?.id, email: req.user?.email, rol: req.user?.rol }
    );

    // Si el cliente ya trae el parseo (caso normal), lo guardamos ya mismo.
    let parseoGuardado = null;
    if (req.body?.parseo && typeof req.body.parseo === 'object') {
      try {
        const normalizado = normalizeParseo(req.body.parseo, {
          brdId: uploaded.brdId,
          nombre_archivo: uploaded.nombre,
          mime_type: uploaded.contentType,
          tamano_bytes: uploaded.tamano,
          s3_key_original: uploaded.key,
          subido_at: new Date().toISOString(),
        });
        await guardarParseoEnS3(req.user, normalizado);
        parseoGuardado = normalizado;
      } catch (err) {
        // No fallamos toda la subida por un parseo mal formado: el usuario
        // puede reintentar el parseo con PATCH /:brd_id/parseo.
        console.warn('[borradores-cotizacion] complete: parseo inválido, se omitió:', err?.message || err);
      }
    }

    return res.json({
      ok: true,
      brd_id: uploaded.brdId,
      nombre: uploaded.nombre,
      tamano: uploaded.tamano,
      key: uploaded.key,
      parseo: parseoGuardado,
    });
  } catch (err) {
    const msg = err?.message || 'No se pudo completar la subida';
    const code = /no encontrada|expirada|autorizado/i.test(msg)
      ? 404
      : /supera el tamaño|inválid|faltan chunks/i.test(msg)
        ? 400
        : 500;
    if (code >= 500) console.error('[borradores-cotizacion] complete error:', msg);
    return res.status(code).json({ error: msg });
  }
}

/**
 * PATCH /:brd_id/parseo — sobreescribe el JSON de parseo del borrador.
 * Útil si el cliente vuelve a resolver contra BD (ej. tras agregar perfiles).
 */
async function actualizarParseo(req, res) {
  if (!ensureS3(res)) return;
  try {
    const brdId = String(req.params.brd_id || '').trim();
    const parseo = req.body?.parseo;
    if (!parseo || typeof parseo !== 'object') {
      return res.status(400).json({ error: 'parseo es requerido en el body' });
    }
    // Necesitamos el original para heredar metadata; leemos el parseo previo si existe.
    const previo = await readParseoJson(req.user, brdId);
    if (!previo) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }
    const normalizado = normalizeParseo(parseo, {
      brdId,
      nombre_archivo: previo.nombre_archivo,
      mime_type: previo.mime_type,
      tamano_bytes: previo.tamano_bytes,
      s3_key_original: previo.s3_key_original,
      subido_at: previo.subido_at,
    });
    await guardarParseoEnS3(req.user, normalizado);
    return res.json({ ok: true, parseo: normalizado });
  } catch (err) {
    console.error('[borradores-cotizacion] parseo error:', err?.message || err);
    return res.status(400).json({ error: err?.message || 'No se pudo guardar el parseo' });
  }
}

/** GET / — lista todos los borradores del usuario (nombre + resumen). */
async function listarBorradores(req, res) {
  if (!ensureS3(res)) return;
  try {
    const prefijo = construirPrefijoUsuario(req.user);
    if (!prefijo) return res.status(400).json({ error: 'Usuario sin rol o correo válidos.' });

    const objs = await s3.listObjectsUnderPrefix(prefijo);
    // Nos quedamos solo con los `parseo.json` que representan un borrador válido.
    const parseoKeys = objs
      .map((o) => o.key)
      .filter((k) => /\/parseo\.json$/i.test(k));

    // Leemos en paralelo (con un límite pequeño de concurrencia para no saturar).
    const CONCURRENCY = 6;
    const borradores = [];
    for (let i = 0; i < parseoKeys.length; i += CONCURRENCY) {
      const lote = parseoKeys.slice(i, i + CONCURRENCY);
      const parseados = await Promise.all(
        lote.map(async (key) => {
          const buf = await getObjectBufferOrNull(key);
          if (!buf) return null;
          try {
            const p = JSON.parse(buf.toString('utf8'));
            return {
              id: p.id,
              nombre_archivo: p.nombre_archivo,
              mime_type: p.mime_type,
              tamano_bytes: p.tamano_bytes,
              subido_at: p.subido_at,
              updated_at: p.updated_at,
              resumen: p.resumen,
            };
          } catch {
            return null;
          }
        })
      );
      for (const b of parseados) if (b) borradores.push(b);
    }
    borradores.sort((a, b) => {
      const ta = a.updated_at ? Date.parse(a.updated_at) : 0;
      const tb = b.updated_at ? Date.parse(b.updated_at) : 0;
      return tb - ta;
    });
    return res.json({ borradores });
  } catch (err) {
    console.error('[borradores-cotizacion] listar error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudieron listar los borradores' });
  }
}

/** GET /:brd_id — detalle completo del parseo. */
async function obtenerBorrador(req, res) {
  if (!ensureS3(res)) return;
  try {
    const brdId = String(req.params.brd_id || '').trim();
    const parseo = await readParseoJson(req.user, brdId);
    if (!parseo) return res.status(404).json({ error: 'Borrador no encontrado' });
    return res.json({ borrador: parseo });
  } catch (err) {
    console.error('[borradores-cotizacion] obtener error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudo cargar el borrador' });
  }
}

/** POST /:brd_id/descargar — URL firmada para descargar el archivo original. */
async function generarUrlDescarga(req, res) {
  if (!ensureS3(res)) return;
  try {
    const brdId = String(req.params.brd_id || '').trim();
    const parseo = await readParseoJson(req.user, brdId);
    if (!parseo) return res.status(404).json({ error: 'Borrador no encontrado' });
    const key = parseo.s3_key_original;
    if (!key || typeof key !== 'string') {
      return res.status(404).json({ error: 'El borrador no tiene archivo original asociado' });
    }
    // Aseguramos que la key pertenece al prefijo del usuario (defensa en profundidad).
    const prefijo = construirPrefijoUsuario(req.user);
    if (!prefijo || !key.startsWith(prefijo)) {
      return res.status(403).json({ error: 'No autorizado para descargar este archivo' });
    }
    const expiresSeconds = 600;
    const url = await s3.getPresignedDownloadUrl(key, { expiresSeconds });
    return res.json({ url, expira_en: expiresSeconds });
  } catch (err) {
    console.error('[borradores-cotizacion] descargar error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudo generar la URL de descarga' });
  }
}

/** DELETE /:brd_id — borra original + parseo. */
async function eliminarBorrador(req, res) {
  if (!ensureS3(res)) return;
  try {
    const brdId = String(req.params.brd_id || '').trim();
    const parseo = await readParseoJson(req.user, brdId);
    if (!parseo) return res.status(404).json({ error: 'Borrador no encontrado' });
    const prefijo = construirPrefijoUsuario(req.user);
    if (!prefijo) return res.status(400).json({ error: 'Usuario sin rol o correo válidos.' });

    // Listar todos los objetos bajo `{prefijo}{brdId}/` y borrarlos.
    const carpeta = `${prefijo}${brdId}/`;
    const objs = await s3.listObjectsUnderPrefix(carpeta);
    for (const o of objs) {
      try {
        await s3.deleteObjectByKey(o.key);
      } catch (err) {
        console.warn(
          '[borradores-cotizacion] eliminar objeto fallido:',
          o.key,
          err?.message || err
        );
      }
    }
    return res.json({ ok: true, id: brdId });
  } catch (err) {
    console.error('[borradores-cotizacion] eliminar error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudo eliminar el borrador' });
  }
}

/* -------------------------------------------------------------------------- */
/* Adjuntar borrador a un pedido: crea la cotización real en BD               */
/* -------------------------------------------------------------------------- */

async function generarNumeroCotizacion(connection) {
  // Formato: COT-YYYYMMDD-HHMMSS-RRRR — igual espíritu que el resto, único por
  // insert. Reusamos la lógica de comprobación por UNIQUE del propio INSERT
  // (numero_cotizacion es UNIQUE) con retry-on-collision suave.
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const base = `COT-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, '0');
  return `${base}-${rand}`;
}

/**
 * POST /:brd_id/adjuntar
 * Body: { pedido_id: number }
 *
 * Requiere que TODOS los items del parseo estén matched contra la BD. Crea
 * una cotización en estado BORRADOR vinculada al pedido, con items desde el
 * parseo. NO envía la cotización: el vendedor la puede seguir editando
 * después desde la pantalla normal de cotizaciones.
 */
async function adjuntarAPedido(req, res) {
  if (!ensureS3(res)) return;
  const brdId = String(req.params.brd_id || '').trim();
  const pedidoId = Number(req.body?.pedido_id);
  if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ error: 'pedido_id es requerido' });
  }
  try {
    const parseo = await readParseoJson(req.user, brdId);
    if (!parseo) return res.status(404).json({ error: 'Borrador no encontrado' });
    if (!parseo.resumen?.puede_adjuntar) {
      return res.status(400).json({
        error:
          'El borrador tiene perfiles o exámenes que no están vinculados con la base de datos. Corríjalos antes de adjuntarlo.',
        detalle: {
          perfiles_unmatched: parseo.resumen?.perfiles_unmatched_nombres || [],
          examenes_unmatched: parseo.resumen?.examenes_unmatched_nombres || [],
        },
      });
    }

    // Verificar que el pedido existe.
    const [pedidos] = await pool.execute('SELECT id, empresa_id FROM pedidos WHERE id = ?', [
      pedidoId,
    ]);
    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Construir items para INSERT en `cotizacion_items`.
    // Nota: `cantidad` viene del parseo (por defecto 1 por línea del archivo);
    // el vendedor puede ajustarla luego editando la cotización desde la UI.
    const items = [];
    for (const it of parseo.items) {
      const cantidad = Math.max(1, Math.trunc(Number(it.cantidad) || 1));
      const precio_base = Math.max(0, Number(it.precio_archivo) || 0);
      const precio_final = precio_base;
      const subtotal = precio_final * cantidad;

      if (it.tipo_item === 'PERFIL') {
        if (!it.perfil_id || !it.tipo_emo) {
          return res.status(400).json({
            error: `El perfil "${it.nombre_archivo}" no tiene perfil_id o tipo_emo válidos.`,
          });
        }
        items.push({
          tipo_item: 'PERFIL',
          perfil_id: Number(it.perfil_id),
          tipo_emo: String(it.tipo_emo).toUpperCase(),
          examen_id: null,
          nombre: it.nombre_bd || it.nombre_archivo || 'Perfil',
          cantidad,
          precio_base,
          precio_final,
          variacion_pct: 0,
          subtotal,
        });
      } else {
        if (!it.examen_id) {
          return res.status(400).json({
            error: `El examen "${it.nombre_archivo}" no tiene examen_id.`,
          });
        }
        items.push({
          tipo_item: 'EXAMEN',
          perfil_id: null,
          tipo_emo: null,
          examen_id: Number(it.examen_id),
          nombre: it.nombre_bd || it.nombre_archivo || 'Examen',
          cantidad,
          precio_base,
          precio_final,
          variacion_pct: 0,
          subtotal,
        });
      }
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'El borrador no tiene items para adjuntar' });
    }

    const total = items.reduce((acc, it) => acc + it.subtotal, 0);

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    let cotizacionId;
    let numero_cotizacion;
    try {
      numero_cotizacion = await generarNumeroCotizacion(connection);
      const [result] = await connection.execute(
        `INSERT INTO cotizaciones (
          numero_cotizacion, pedido_id, cotizacion_base_id, es_complementaria,
          estado, creador_tipo, creador_id, total
        ) VALUES (?, ?, NULL, 0, 'BORRADOR', ?, ?, ?)`,
        [
          numero_cotizacion,
          pedidoId,
          String(req.user?.rol || '').toLowerCase() === 'cliente' ? 'CLIENTE' : 'VENDEDOR',
          req.user ? req.user.id : null,
          total,
        ]
      );
      cotizacionId = result.insertId;

      for (const it of items) {
        await connection.execute(
          `INSERT INTO cotizacion_items (
            cotizacion_id, tipo_item, perfil_id, tipo_emo, examen_id,
            nombre, cantidad, precio_base, precio_final, variacion_pct, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cotizacionId,
            it.tipo_item,
            it.perfil_id,
            it.tipo_emo,
            it.examen_id,
            it.nombre,
            it.cantidad,
            it.precio_base,
            it.precio_final,
            it.variacion_pct,
            it.subtotal,
          ]
        );
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    // Marcar el parseo con la cotización adjuntada (metadata útil, no bloquea).
    try {
      const nuevo = {
        ...parseo,
        cotizacion_adjuntada: {
          cotizacion_id: cotizacionId,
          numero_cotizacion,
          pedido_id: pedidoId,
          adjuntada_at: new Date().toISOString(),
        },
      };
      await guardarParseoEnS3(req.user, nuevo);
    } catch (err) {
      console.warn(
        '[borradores-cotizacion] adjuntar: no se pudo actualizar parseo:',
        err?.message || err
      );
    }

    return res.json({
      ok: true,
      cotizacion_id: cotizacionId,
      numero_cotizacion,
      pedido_id: pedidoId,
      total,
      items_count: items.length,
    });
  } catch (err) {
    console.error('[borradores-cotizacion] adjuntar error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'No se pudo adjuntar el borrador' });
  }
}

/* -------------------------------------------------------------------------- */
/* Resolución de nombres SIN SEDE (para el matching del borrador)              */
/* -------------------------------------------------------------------------- */

/** Normaliza igual que emoPerfilesController: sin tildes, minúsculas, colapsando espacios. */
function normalizarNombre(s) {
  const map = {
    á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n',
    Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u', Ñ: 'n',
  };
  let t = String(s || '').trim();
  t = t.replace(/\u00a0/g, ' ').replace(/[\u200b-\u200d\ufeff]/g, '');
  t = t.replace(/[áéíóúñÁÉÍÓÚÑ]/g, (c) => map[c] || c);
  return t.toLowerCase().replace(/\s+/g, ' ');
}

function normalizarNombreCompacto(s) {
  return normalizarNombre(s).replace(/\s+/g, '');
}

/**
 * POST /resolver-nombres
 * Body: {
 *   perfiles: [{ nombre: string, tipo_emo: string }],
 *   examenes: [string]     // solo nombres, sin cantidad
 * }
 *
 * Devuelve los ids matcheados para cada entrada (por índice). No usa `sede_id`.
 * Se usa desde el cliente cuando el vendedor sube un borrador para pre-resolver
 * contra la BD antes de guardarlo.
 */
async function resolverNombres(req, res) {
  try {
    const perfilesIn = Array.isArray(req.body?.perfiles) ? req.body.perfiles : [];
    const examenesIn = Array.isArray(req.body?.examenes) ? req.body.examenes : [];

    /* --- Perfiles --- */
    const [perfilesRows] = await pool.execute('SELECT id, nombre FROM emo_perfiles');
    const perfilResults = perfilesIn.map((p) => {
      const nombre = String(p?.nombre || '').trim();
      const tipoEmo = String(p?.tipo_emo || '').toUpperCase();
      if (!nombre) return { matched: false, reason: 'sin_nombre' };
      if (!TIPOS_EMO_VALIDOS.has(tipoEmo)) {
        return { matched: false, reason: 'sin_tipo_emo' };
      }
      const norm = normalizarNombre(nombre);
      const compact = normalizarNombreCompacto(nombre);
      let match = perfilesRows.find((row) => normalizarNombre(row.nombre) === norm);
      let laxa = false;
      if (!match && compact.length >= 2) {
        match = perfilesRows.find((row) => normalizarNombreCompacto(row.nombre) === compact);
        if (match) laxa = true;
      }
      if (!match) return { matched: false, reason: 'perfil_no_existe' };
      return {
        matched: true,
        perfil_id: match.id,
        nombre_bd: String(match.nombre || '').trim(),
        tipo_emo: tipoEmo,
        coincidencia_laxa: laxa,
      };
    });

    // Además, cargamos los exámenes del perfil (para poder validar que el perfil
    // tenga tipo_emo asignado y no dejar cotizar contra un perfil "vacío").
    for (let i = 0; i < perfilResults.length; i++) {
      const r = perfilResults[i];
      if (!r.matched) continue;
      const [tieneExa] = await pool.execute(
        `SELECT COUNT(*) AS n FROM emo_perfil_examenes
         WHERE perfil_id = ? AND tipo_emo = ?`,
        [r.perfil_id, r.tipo_emo]
      );
      const n = Number(tieneExa[0]?.n || 0);
      if (n === 0) {
        perfilResults[i] = {
          matched: false,
          reason: 'perfil_sin_examenes_para_tipo_emo',
          perfil_id: r.perfil_id,
          nombre_bd: r.nombre_bd,
          tipo_emo: r.tipo_emo,
        };
      }
    }

    /* --- Exámenes sueltos --- */
    // Estrategia: normalizar el nombre y buscar por igualdad EXACTA en el
    // catálogo. No hacemos scoring aquí para no meter falsos positivos; el
    // cliente ya viene con los nombres tal cual salieron del archivo.
    const nombresParaSql = examenesIn
      .map((n) => String(n || '').trim())
      .filter((n) => n.length > 0);
    let examenesRows = [];
    if (nombresParaSql.length > 0) {
      const [rows] = await pool.execute(
        `SELECT id, nombre FROM examenes WHERE activo = 1`
      );
      examenesRows = rows;
    }
    const mapaExamenes = new Map();
    for (const row of examenesRows) {
      mapaExamenes.set(normalizarNombre(row.nombre), row);
    }
    const mapaExamenesCompact = new Map();
    for (const row of examenesRows) {
      mapaExamenesCompact.set(normalizarNombreCompacto(row.nombre), row);
    }
    const examenResults = examenesIn.map((raw) => {
      const nombre = String(raw || '').trim();
      if (!nombre) return { matched: false, reason: 'sin_nombre' };
      const norm = normalizarNombre(nombre);
      let match = mapaExamenes.get(norm);
      let laxa = false;
      if (!match) {
        const compact = normalizarNombreCompacto(nombre);
        if (compact.length >= 3) {
          match = mapaExamenesCompact.get(compact);
          if (match) laxa = true;
        }
      }
      if (!match) return { matched: false, reason: 'examen_no_existe' };
      return {
        matched: true,
        examen_id: match.id,
        nombre_bd: String(match.nombre || '').trim(),
        coincidencia_laxa: laxa,
      };
    });

    return res.json({
      perfiles: perfilResults,
      examenes: examenResults,
    });
  } catch (err) {
    console.error('[borradores-cotizacion] resolver-nombres error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudieron resolver los nombres contra la BD' });
  }
}

/**
 * GET /buscar-examenes?q=...
 * Búsqueda por letra (LIKE) en el catálogo activo, sin sede. Para vincular
 * manualmente exámenes de una propuesta que no coincidieron por nombre.
 */
async function buscarExamenesCatalogo(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    if (q.length < 1) return res.json({ examenes: [] });
    const like = `%${q.replace(/[%_]/g, '')}%`;
    const [rows] = await pool.execute(
      `SELECT id, nombre
         FROM examenes
        WHERE activo = 1 AND nombre LIKE ?
        ORDER BY
          CASE WHEN LOWER(nombre) LIKE LOWER(?) THEN 0 ELSE 1 END,
          nombre ASC
        LIMIT 40`,
      [like, `${q.replace(/[%_]/g, '')}%`]
    );
    return res.json({
      examenes: (rows || []).map((r) => ({
        examen_id: Number(r.id),
        nombre_examen: String(r.nombre || '').trim(),
      })),
    });
  } catch (err) {
    console.error('[borradores-cotizacion] buscar-examenes error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudieron buscar exámenes' });
  }
}

/**
 * GET /buscar-perfiles?q=...
 * Búsqueda por letra en emo_perfiles para vincular un perfil de la propuesta
 * a uno ya existente en BD.
 */
async function buscarPerfilesCatalogo(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    if (q.length < 1) return res.json({ perfiles: [] });
    const like = `%${q.replace(/[%_]/g, '')}%`;
    const [rows] = await pool.execute(
      `SELECT id, nombre
         FROM emo_perfiles
        WHERE nombre LIKE ?
        ORDER BY
          CASE WHEN LOWER(nombre) LIKE LOWER(?) THEN 0 ELSE 1 END,
          nombre ASC
        LIMIT 40`,
      [like, `${q.replace(/[%_]/g, '')}%`]
    );
    return res.json({
      perfiles: (rows || []).map((r) => ({
        perfil_id: Number(r.id),
        nombre: String(r.nombre || '').trim(),
      })),
    });
  } catch (err) {
    console.error('[borradores-cotizacion] buscar-perfiles error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudieron buscar perfiles' });
  }
}

module.exports = {
  iniciarSubida,
  recibirChunk,
  completarSubida,
  actualizarParseo,
  listarBorradores,
  obtenerBorrador,
  generarUrlDescarga,
  eliminarBorrador,
  adjuntarAPedido,
  resolverNombres,
  buscarExamenesCatalogo,
  buscarPerfilesCatalogo,
};
