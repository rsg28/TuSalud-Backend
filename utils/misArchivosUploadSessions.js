/**
 * TuSalud — Sesiones de subida por chunks para el archivador personal.
 *
 * Motivación: Fortinet y otros firewalls corporativos suelen bloquear o
 * truncar un único POST JSON grande (`file_base64` de varios MB). El cliente
 * sube el archivo en lotes pequeños; al completar, el servidor ensambla el
 * buffer y lo sube a S3 en la carpeta del usuario (`${rol}/${email}/cotizaciones/`).
 *
 * Diferencias con `pdfPerfilUploadSessions.js`:
 *   - Este flujo NO procesa el archivo (no OCR ni extracción). Solo ensambla
 *     + sube a S3.
 *   - El nombre del archivo, tipo MIME y bytes esperados se declaran en `init`
 *     y se conservan por sesión.
 *   - Los logs quedan en consola con el prefijo `[mis-archivos-chunked]` para
 *     que sean fáciles de filtrar en el servidor.
 *
 * Almacenamiento en memoria (una sola instancia EC2). TTL automático.
 */

const crypto = require('crypto');
const s3 = require('./s3');

const LOG_PREFIX = '[mis-archivos-chunked]';

const SESSION_TTL_MS = Math.max(
  5 * 60_000,
  parseInt(process.env.MIS_ARCHIVOS_CHUNK_SESSION_TTL_MS || String(30 * 60_000), 10) || 30 * 60_000
);

/** Igual que en el POST directo: default 25 MB, override con env. */
const MAX_FILE_BYTES = Math.max(
  1 * 1024 * 1024,
  (parseInt(process.env.MIS_ARCHIVOS_MAX_MB || '25', 10) || 25) * 1024 * 1024
);

/** Log detallado solo si se activa por env (evita ruido en prod). */
const VERBOSE =
  process.env.MIS_ARCHIVOS_CHUNK_LOG === '1' ||
  String(process.env.MIS_ARCHIVOS_CHUNK_LOG || '').toLowerCase() === 'true';

/** @type {Map<string, UploadSession>} */
const sessions = new Map();

/**
 * @typedef {object} UploadSession
 * @property {string} uploadId
 * @property {number} userId
 * @property {string} nombre
 * @property {string} contentType
 * @property {number} totalChunks
 * @property {number|null} totalBytes  bytes originales declarados por el cliente (opcional)
 * @property {Map<number, string>} chunks  index → base64 fragment
 * @property {number} createdAt
 * @property {number} bytesAccum  bytes decodificados acumulados (protección DoS)
 */

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

/**
 * Inicia una sesión de subida por chunks.
 * @returns {{ uploadId: string, totalChunks: number }}
 */
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

  const uploadId = newId('miarch');
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
    contentType: session.contentType,
    totalBytes: bytesDeclarados,
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
  if (tot !== session.totalChunks) {
    throw new Error('total no coincide con la sesión');
  }
  const raw = String(chunkBase64 || '').replace(/\s/g, '');
  if (!raw) throw new Error('chunk_base64 vacío');

  // Rechazo temprano por tamaño: si el acumulado ya supera el límite,
  // detenemos antes de guardar más chunks en memoria.
  // Estimación conservadora: base64 crece ~4/3 respecto al binario.
  const estimatedBinBytes = Math.ceil((raw.length * 3) / 4);
  if (!session.chunks.has(idx)) {
    session.bytesAccum += estimatedBinBytes;
  }
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
 * Ensambla el buffer y lo sube a S3 usando la key personal del usuario.
 * NO devuelve un jobId — la subida a S3 se hace síncrona dentro del `complete`
 * (a diferencia del flujo de PDF, no hay procesamiento pesado).
 *
 * @param {number} userId
 * @param {string} uploadId
 * @param {(nombreArchivo: string) => string|null} buildKey  callback para construir la key S3 desde el nombre
 * @param {object} usuarioMeta  metadata para el objeto S3 (usuario_id, email, rol)
 */
async function completeToS3(userId, uploadId, buildKey, usuarioMeta) {
  purgeExpired();
  const session = sessions.get(uploadId);
  if (!session) throw new Error('Sesión de subida no encontrada o expirada');
  if (session.userId !== Number(userId)) throw new Error('No autorizado para esta sesión');
  if (session.chunks.size !== session.totalChunks) {
    throw new Error(`Faltan chunks (${session.chunks.size}/${session.totalChunks})`);
  }

  const buffer = assembleBuffer(session);
  if (!buffer.length) {
    sessions.delete(uploadId);
    throw new Error('El archivo está vacío');
  }
  if (buffer.length > MAX_FILE_BYTES) {
    sessions.delete(uploadId);
    throw new Error(
      `El archivo supera el tamaño máximo (${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB)`
    );
  }

  const key = buildKey(session.nombre);
  if (!key) {
    sessions.delete(uploadId);
    throw new Error('No se pudo construir la key del archivo (usuario inválido)');
  }

  const t0 = Date.now();
  log('info', 'complete:uploading-to-s3', {
    uploadId,
    key,
    bytes: buffer.length,
    contentType: session.contentType,
  });

  try {
    const result = await s3.putObjectAtKey(buffer, key, {
      contentType: session.contentType,
      metadata: {
        usuario_id: String(usuarioMeta?.id ?? ''),
        usuario_email: String(usuarioMeta?.email ?? ''),
        usuario_rol: String(usuarioMeta?.rol ?? ''),
        nombre_original: session.nombre.slice(0, 200),
        chunked: '1',
        chunks_total: String(session.totalChunks),
      },
    });

    sessions.delete(uploadId);

    log('info', 'complete:s3-ok', {
      uploadId,
      key: result.key,
      bytes: result.size,
      ms: Date.now() - t0,
    });

    return {
      nombre: session.nombre,
      tamano: result.size,
      key: result.key,
    };
  } catch (err) {
    log('error', 'complete:s3-fail', {
      uploadId,
      key,
      message: err?.message || String(err),
    });
    throw err;
  }
}

module.exports = {
  createSession,
  putChunk,
  completeToS3,
  MAX_FILE_BYTES,
};
