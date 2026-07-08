/**
 * Subida de PDF perfil por chunks + procesamiento async (polling).
 */

const sessions = require('../utils/pdfPerfilUploadSessions');

async function initChunkedUpload(req, res) {
  try {
    const fileName = req.body?.file_name ?? req.body?.fileName ?? null;
    const totalChunks = req.body?.total_chunks ?? req.body?.totalChunks;
    if (totalChunks == null) {
      return res.status(400).json({ error: 'total_chunks es requerido' });
    }
    const out = sessions.createSession(req.user.id, { fileName, totalChunks });
    return res.json({ upload_id: out.uploadId, uploadId: out.uploadId, total_chunks: out.totalChunks });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'No se pudo iniciar la subida' });
  }
}

async function receiveChunk(req, res) {
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
    const out = sessions.putChunk(req.user.id, {
      uploadId: String(uploadId),
      index,
      total,
      chunkBase64,
    });
    return res.json(out);
  } catch (err) {
    const msg = err.message || 'Error al recibir chunk';
    const code = /no encontrada|expirada|autorizado/i.test(msg) ? 404 : 400;
    return res.status(code).json({ error: msg });
  }
}

async function completeChunkedUpload(req, res) {
  try {
    const uploadId = req.body?.upload_id ?? req.body?.uploadId;
    if (!uploadId) {
      return res.status(400).json({ error: 'upload_id es requerido' });
    }
    const out = sessions.startProcessingJob(req.user.id, String(uploadId));
    return res.json({
      job_id: out.jobId,
      jobId: out.jobId,
      status: out.status,
      message:
        'Archivo recibido. El servidor está procesando el PDF; consulte el estado con job_id.',
    });
  } catch (err) {
    const msg = err.message || 'No se pudo completar la subida';
    const code = /no encontrada|expirada|autorizado/i.test(msg) ? 404 : 400;
    return res.status(code).json({ error: msg });
  }
}

async function getChunkedJobStatus(req, res) {
  try {
    const jobId = req.params.jobId;
    const status = sessions.getJobStatus(req.user.id, jobId);
    if (!status) {
      return res.status(404).json({ error: 'Trabajo no encontrado o expirado' });
    }
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error al consultar estado' });
  }
}

module.exports = {
  initChunkedUpload,
  receiveChunk,
  completeChunkedUpload,
  getChunkedJobStatus,
};
