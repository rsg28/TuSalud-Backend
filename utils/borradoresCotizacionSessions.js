/**
 * TuSalud — Sesiones de subida por chunks para BORRADORES DE COTIZACIÓN.
 *
 * Un "borrador de cotización" es un archivo (PDF/Excel) que el vendedor sube
 * a su archivador personal en S3 SIN vincularlo aún a un pedido. Cuando
 * decide asignarlo a un pedido, el sistema crea la cotización real y
 * mantiene el archivo original como respaldo.
 *
 * Estructura en S3 (una carpeta por borrador, para poder guardar el archivo
 * original + el JSON de parseo bajo el mismo prefijo y facilitar borrado):
 *
 *   {rol}/{email}/borradores-cotizacion/{brd_id}/
 *     ├── original.{ext}       ← el archivo tal cual lo subió el usuario
 *     └── parseo.json          ← metadata + matching contra BD (se sobreescribe)
 *
 * Este módulo se ocupa solo del ENSAMBLADO chunked del archivo original y su
 * subida a S3. El JSON de parseo se guarda vía otro endpoint (más barato,
 * porque siempre es pequeño y viene ya construido del cliente).
 *
 * Comparte espíritu con `misArchivosUploadSessions.js` pero:
 *   - Genera un `brd_id` al terminar la subida (así el ID viaja al parseo).
 *   - Usa una key S3 fija dentro de una carpeta para permitir asociar
 *     original + parseo en el mismo prefijo.
 */

const crypto = require('crypto');
const s3 = require('./s3');

const LOG_PREFIX = '[borradores-cotizacion-chunked]';

const SESSION_TTL_MS = Math.max(
  5 * 60_000,
  parseInt(process.env.BORRADORES_COTIZACION_SESSION_TTL_MS || String(30 * 60_000), 10) ||
    30 * 60_000
);

const MAX_FILE_BYTES = Math.max(
  1 * 1024 * 1024,
  (parseInt(process.env.BORRADORES_COTIZACION_MAX_MB || '25', 10) || 25) * 1024 * 1024
);

const VERBOSE =
  process.env.BORRADORES_COTIZACION_LOG === '1' ||
  String(process.env.BORRADORES_COTIZACION_LOG || '').toLowerCase() === 'true';

/** @type {Map<string, UploadSession>} */
const sessions = new Map();

function log(level, event, data) {
  if (level === 'error' || level === 'warn' || VERBOSE) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`${LOG_PREFIX} ${event}`, data || '');
  }
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function purgeExpired() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
      log('info', 'session:expired', { uploadId: id, ageMs: now - s.createdAt });
    }
  }
}

setInterval(purgeExpired, 60_000).unref?.();

function sanitizarNombre(nombre) {
  const s = String(nombre || '').trim();
  if (!s) return null;
  const limpio = s
    .replace(/[/\\]+/g, '_')
    .replace(/[\u0000-\u001f]+/g, '')
    .replace(/^\.+/, '')
    .slice(0, 200);
  return limpio || null;
}

/** Extrae extensión en minúsculas del nombre. Devuelve '' si no hay. */
function extensionDeNombre(nombre) {
  const idx = String(nombre || '').lastIndexOf('.');
  if (idx <= 0) return '';
  const ext = String(nombre)
    .slice(idx + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 10);
  return ext ? `.${ext}` : '';
}

function createSession(userId, { nombre, totalChunks, contentType, totalBytes }) {
  purgeExpired();
  const total = Number(totalChunks);
  if (!Number.isInteger(total) || total < 1 || total > 20_000) {
    throw new Error('total_chunks inválido');
  }
  const nombreLimpio = sanitizarNombre(nombre);
  if (!nombreLimpio) throw new Error('nombre inválido');

  const bytesDeclarados =
    totalBytes != null && Number.isFinite(Number(totalBytes)) ? Number(totalBytes) : null;
  if (bytesDeclarados != null && bytesDeclarados > MAX_FILE_BYTES) {
    throw new Error(
      `El archivo supera el tamaño máximo (${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB)`
    );
  }

  const uploadId = newId('brdupl');
  const session = {
    uploadId,
    userId: Number(userId),
    nombre: nombreLimpio,
    contentType: String(contentType || 'application/octet-stream').toLowerCase().slice(0, 150),
    totalChunks: total,
    totalBytes: bytesDeclarados,
    chunks: new Map(),
    createdAt: Date.now(),
    bytesAccum: 0,
  };
  sessions.set(uploadId, session);
  log('info', 'session:created', {
    uploadId,
    userId: session.userId,
    nombre: nombreLimpio,
    totalChunks: total,
  });
  return { uploadId, totalChunks: total };
}

function putChunk(userId, { uploadId, index, total, chunkBase64 }) {
  purgeExpired();
  const session = sessions.get(uploadId);
  if (!session) throw new Error('Sesión de subida no encontrada o expirada');
  if (session.userId !== Number(userId)) throw new Error('No autorizado para esta sesión');
  const idx = Number(index);
  const tot = Number(total);
  if (!Number.isInteger(idx) || idx < 0 || idx >= session.totalChunks) {
    throw new Error('Índice de chunk inválido');
  }
  if (tot !== session.totalChunks) throw new Error('total no coincide con la sesión');

  const raw = String(chunkBase64 || '').replace(/\s/g, '');
  if (!raw) throw new Error('chunk_base64 vacío');

  const estimatedBinBytes = Math.ceil((raw.length * 3) / 4);
  if (!session.chunks.has(idx)) session.bytesAccum += estimatedBinBytes;
  if (session.bytesAccum > MAX_FILE_BYTES * 1.1) {
    sessions.delete(uploadId);
    log('warn', 'chunk:overflow', {
      uploadId,
      bytesAccum: session.bytesAccum,
      max: MAX_FILE_BYTES,
    });
    throw new Error(
      `El archivo supera el tamaño máximo (${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB)`
    );
  }

  session.chunks.set(idx, raw);
  const received = session.chunks.size;

  if (VERBOSE) {
    log('info', 'chunk:received', {
      uploadId,
      index: idx,
      received,
      total: session.totalChunks,
      b64Bytes: raw.length,
    });
  }

  return {
    uploadId,
    received,
    total: session.totalChunks,
    complete: received === session.totalChunks,
  };
}

function assembleBuffer(session) {
  const parts = [];
  let totalLen = 0;
  for (let i = 0; i < session.totalChunks; i++) {
    const b64 = session.chunks.get(i);
    if (!b64) throw new Error(`Falta el chunk ${i + 1} de ${session.totalChunks}`);
    const buf = Buffer.from(b64, 'base64');
    totalLen += buf.length;
    if (totalLen > MAX_FILE_BYTES) {
      throw new Error(
        `El archivo supera el tamaño máximo (${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB)`
      );
    }
    parts.push(buf);
  }
  return Buffer.concat(parts, totalLen);
}

/**
 * Genera un `brd_id` único y sube el archivo original a S3 bajo la carpeta
 * personal del usuario. NO guarda parseo (eso se hace en un segundo paso).
 *
 * @param {number} userId
 * @param {string} uploadId
 * @param {(brdId: string, keyRelativo: string) => string|null} buildKey
 *   Callback que devuelve la key completa en S3. Recibe el id del borrador
 *   y el nombre relativo (ej. `original.pdf`). Debe respetar la carpeta
 *   del usuario `{rol}/{email}/borradores-cotizacion/{brdId}/original.{ext}`.
 * @param {{ id?: number, email?: string, rol?: string }} usuarioMeta
 */
async function completeToS3(userId, uploadId, buildKey, usuarioMeta) {
  purgeExpired();
  const session = sessions.get(uploadId);
  if (!session) throw new Error('Sesión de subida no encontrada o expirada');
  if (session.userId !== Number(userId)) throw new Error('No autorizado para esta sesión');
  if (session.chunks.size !== session.totalChunks) {
    throw new Error(`Faltan chunks (${session.chunks.size}/${session.totalChunks})`);
  }

  let buffer;
  try {
    buffer = assembleBuffer(session);
  } finally {
    sessions.delete(uploadId);
  }
  if (!buffer.length) throw new Error('El archivo está vacío');

  const brdId = newId('brd');
  const ext = extensionDeNombre(session.nombre);
  const keyRelativo = `original${ext}`;
  const key = buildKey(brdId, keyRelativo);
  if (!key) throw new Error('No se pudo construir la key del archivo (usuario inválido)');

  const t0 = Date.now();
  log('info', 'complete:uploading-to-s3', {
    uploadId,
    brdId,
    key,
    bytes: buffer.length,
    contentType: session.contentType,
  });

  const result = await s3.putObjectAtKey(buffer, key, {
    contentType: session.contentType,
    metadata: {
      usuario_id: String(usuarioMeta?.id ?? ''),
      usuario_email: String(usuarioMeta?.email ?? ''),
      usuario_rol: String(usuarioMeta?.rol ?? ''),
      borrador_id: brdId,
      nombre_original: session.nombre.slice(0, 200),
      chunked: '1',
      chunks_total: String(session.totalChunks),
    },
  });

  log('info', 'complete:s3-ok', {
    brdId,
    key: result.key,
    bytes: result.size,
    ms: Date.now() - t0,
  });

  return {
    brdId,
    nombre: session.nombre,
    tamano: result.size,
    key: result.key,
    contentType: session.contentType,
  };
}

module.exports = {
  createSession,
  putChunk,
  completeToS3,
  MAX_FILE_BYTES,
};
