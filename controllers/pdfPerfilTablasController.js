const { extractPerfilPdfTablesFromBuffer } = require('../utils/extractPerfilPdfTablesV2');

function isPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-';
}

/**
 * POST JSON `{ file_base64 }` — solo PDF. Tablas extraídas en Node (pdfjs-dist), sin Python.
 */
async function extraerPdfPerfilTablas(req, res) {
  try {
    let buffer = null;

    if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
    } else if (req.body && typeof req.body.file_base64 === 'string') {
      const raw = String(req.body.file_base64).replace(/\s/g, '');
      if (!raw) {
        return res.status(400).json({ error: 'file_base64 está vacío.' });
      }
      buffer = Buffer.from(raw, 'base64');
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        error:
          'Adjunte un PDF: multipart con campo "file", o JSON con "file_base64" (base64 del archivo).',
      });
    }

    if (!isPdfBuffer(buffer)) {
      return res.status(400).json({ error: 'Solo se aceptan archivos PDF para extraer tablas de perfil.' });
    }

    const debugRaw = String(req.query?.debug || '').trim().toLowerCase();
    const debug = debugRaw === '1' || debugRaw === 'true' || debugRaw === 'yes';
    const result = await extractPerfilPdfTablesFromBuffer(buffer, { debug });

    if (result && result.ok === false && result.error) {
      return res.status(400).json({ error: String(result.error) });
    }

    return res.json(result);
  } catch (err) {
    console.error('[pdf-perfil-tablas]', err);
    return res.status(500).json({ error: err.message || 'Error al procesar el PDF.' });
  }
}

module.exports = { extraerPdfPerfilTablas };
