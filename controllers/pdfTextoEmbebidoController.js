const pdfParse = require('pdf-parse');

function isPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-';
}

/**
 * POST multipart campo "file" **o** JSON `{ file_base64 }` — solo texto embebido (sin OCR).
 */
async function extraerPdfTextoEmbebido(req, res) {
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
      return res.status(400).json({ error: 'El archivo no es un PDF válido (cabecera %PDF- no encontrada).' });
    }

    const data = await pdfParse(buffer);
    const text = String(data.text || '').trim();
    return res.json({
      text,
      numpages: data.numpages || 0,
      mode: 'pdf-text',
    });
  } catch (err) {
    console.error('[pdf texto embebido]', err);
    const message = err.message || 'Error al leer el PDF';
    return res.status(500).json({ error: message });
  }
}

module.exports = { extraerPdfTextoEmbebido };
