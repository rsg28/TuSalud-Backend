const pdfParse = require('pdf-parse');

function isPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-';
}

/**
 * @param {Buffer} buf
 * @returns {'jpeg'|'png'|'webp'|'gif'|null}
 */
function sniffRasterImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.length >= 12 &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  const g = buf.slice(0, 6).toString('ascii');
  if (g === 'GIF87a' || g === 'GIF89a') return 'gif';
  return null;
}

let tesseractModulePromise = null;
function loadTesseract() {
  if (!tesseractModulePromise) {
    tesseractModulePromise = Promise.resolve().then(() => require('tesseract.js'));
  }
  return tesseractModulePromise;
}

/**
 * OCR para JPG/PNG/WebP/GIF. Idiomas spa+eng.
 * PSM 6 = bloque uniforme (listas/tablas).
 * @param {Buffer} buffer
 */
async function extraerTextoOcrImagen(buffer) {
  const { createWorker } = await loadTesseract();
  const worker = await createWorker('spa+eng');
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer, {
      tessedit_pageseg_mode: 6,
    });
    return String(text || '').trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * POST multipart campo "file" **o** JSON `{ file_base64 }`.
 * PDF: solo texto embebido (sin OCR). Imagen (JPEG, PNG, WebP, GIF): OCR.
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
          'Adjunte un archivo: multipart con campo "file", o JSON con "file_base64" (base64 del archivo).',
      });
    }

    if (isPdfBuffer(buffer)) {
      const data = await pdfParse(buffer);
      const text = String(data.text || '').trim();
      return res.json({
        text,
        numpages: data.numpages || 0,
        mode: 'pdf-text',
      });
    }

    if (sniffRasterImage(buffer)) {
      const text = await extraerTextoOcrImagen(buffer);
      return res.json({
        text,
        numpages: 1,
        mode: 'image-ocr',
      });
    }

    return res.status(400).json({
      error:
        'Formato no soportado. Use PDF con texto, o imagen JPEG, PNG, WebP o GIF (se aplicará OCR).',
    });
  } catch (err) {
    console.error('[import documento texto]', err);
    const message = err.message || 'Error al leer el archivo';
    return res.status(500).json({ error: message });
  }
}

module.exports = { extraerPdfTextoEmbebido };
