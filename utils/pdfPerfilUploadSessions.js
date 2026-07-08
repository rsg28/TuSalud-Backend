/**
 * TuSalud — Sesiones de subida por chunks + cola de jobs async para PDF perfil.
 *
 * Fortinet y otros firewalls corporativos suelen bloquear o truncar un único
 * POST JSON enorme (file_base64). El cliente sube el PDF en lotes pequeños;
 * al completar, el servidor arma el buffer y procesa el PDF en background
 * mientras el cliente hace polling del estado.
 *
 * Almacenamiento en memoria (una instancia EC2). TTL automático.
 */

const crypto = require('crypto');
const { extractPerfilPdfTablesFromBuffer } = require('./extractPerfilPdfTablesV2');

const SESSION_TTL_MS = Math.max(
  5 * 60_000,
  parseInt(process.env.PDF_CHUNK_SESSION_TTL_MS || String(30 * 60_000), 10) || 30 * 60_000
);
const JOB_TTL_MS = Math.max(
  10 * 60_000,
  parseInt(process.env.PDF_CHUNK_JOB_TTL_MS || String(60 * 60_000), 10) || 60 * 60_000
);
const MAX_FILE_BYTES = Math.max(
  1 * 1024 * 1024,
  (parseInt(process.env.PDF_IMPORT_MAX_MB || '25', 10) || 25) * 1024 * 1024
);

/** @type {Map<string, UploadSession>} */
const sessions = new Map();
/** @type {Map<string, ProcessingJob>} */
const jobs = new Map();

/**
 * @typedef {object} UploadSession
 * @property {string} uploadId
 * @property {number} userId
 * @property {string|null} fileName
 * @property {number} totalChunks
 * @property {Map<number, string>} chunks  index → base64 fragment
 * @property {number} createdAt
 */

/**
 * @typedef {object} ProcessingJob
 * @property {string} jobId
 * @property {number} userId
 * @property {'queued'|'processing'|'done'|'error'} status
 * @property {object|null} result
 * @property {string|null} error
 * @property {number} createdAt
 * @property {number|null} finishedAt
 */

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function purgeExpired() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
  for (const [id, j] of jobs) {
    const ref = j.finishedAt ?? j.createdAt;
    if (now - ref > JOB_TTL_MS) jobs.delete(id);
  }
}

setInterval(purgeExpired, 60_000).unref?.();

function createSession(userId, { fileName, totalChunks }) {
  purgeExpired();
  const total = Number(totalChunks);
  if (!Number.isInteger(total) || total < 1 || total > 10_000) {
    throw new Error('total_chunks inválido');
  }
  const uploadId = newId('upl');
  const session = {
    uploadId,
    userId: Number(userId),
    fileName: fileName ? String(fileName).slice(0, 500) : null,
    totalChunks: total,
    chunks: new Map(),
    createdAt: Date.now(),
  };
  sessions.set(uploadId, session);
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
  session.chunks.set(idx, raw);
  return {
    uploadId,
    received: session.chunks.size,
    total: session.totalChunks,
    complete: session.chunks.size === session.totalChunks,
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
      throw new Error(`El archivo supera el tamaño máximo (${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB)`);
    }
    parts.push(buf);
  }
  return Buffer.concat(parts, totalLen);
}

function isPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-';
}

function startProcessingJob(userId, uploadId) {
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

  if (!isPdfBuffer(buffer)) {
    throw new Error('Solo se aceptan archivos PDF para extraer tablas de perfil.');
  }

  const jobId = newId('job');
  const job = {
    jobId,
    userId: Number(userId),
    status: 'queued',
    result: null,
    error: null,
    createdAt: Date.now(),
    finishedAt: null,
  };
  jobs.set(jobId, job);

  setImmediate(() => {
    runJob(jobId, buffer).catch((err) => {
      const j = jobs.get(jobId);
      if (j) {
        j.status = 'error';
        j.error = err?.message || String(err);
        j.finishedAt = Date.now();
      }
    });
  });

  return { jobId, status: 'queued' };
}

async function runJob(jobId, buffer) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'processing';

  const timeoutMs = Math.max(
    15_000,
    parseInt(process.env.PDF_PERFIL_EXTRACT_TIMEOUT_MS || '120000', 10) || 120_000
  );
  const t0 = Date.now();
  try {
    const result = await Promise.race([
      extractPerfilPdfTablesFromBuffer(buffer, { debug: false }),
      new Promise((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `El PDF tardó más de ${Math.round(timeoutMs / 1000)}s en procesarse. Intente de nuevo.`
              )
            ),
          timeoutMs
        );
      }),
    ]);
    if (result && result.ok === false && result.error) {
      throw new Error(String(result.error));
    }
    job.status = 'done';
    job.result = result;
    job.finishedAt = Date.now();
    if (process.env.PDF_PERFIL_LOG_TIMING === '1') {
      console.log(`[pdf-perfil-chunked] job ${jobId} ${buffer.length}B en ${Date.now() - t0}ms`);
    }
  } catch (err) {
    job.status = 'error';
    job.error = err?.message || String(err);
    job.finishedAt = Date.now();
    console.error(`[pdf-perfil-chunked] job ${jobId} error:`, job.error);
  }
}

function getJobStatus(userId, jobId) {
  purgeExpired();
  const job = jobs.get(jobId);
  if (!job) return null;
  if (job.userId !== Number(userId)) return null;
  const out = {
    jobId: job.jobId,
    job_id: job.jobId,
    status: job.status,
    error: job.error,
  };
  if (job.status === 'done' && job.result) {
    out.result = job.result;
  }
  return out;
}

module.exports = {
  createSession,
  putChunk,
  startProcessingJob,
  getJobStatus,
  MAX_FILE_BYTES,
};
