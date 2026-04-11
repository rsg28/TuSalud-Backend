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

let tesseractJs = null;
/** @type {Error|null} */
let tesseractLoadError = null;

/**
 * Carga tesseract.js una vez. Si falta en el servidor (npm install no ejecutado), error explícito.
 */
function getTesseractJs() {
  if (tesseractLoadError) throw tesseractLoadError;
  if (tesseractJs) return tesseractJs;
  try {
    tesseractJs = require('tesseract.js');
    return tesseractJs;
  } catch (e) {
    const msg = String(e?.message || e);
    const missing =
      e?.code === 'MODULE_NOT_FOUND' && (msg.includes('tesseract.js') || msg.includes("Cannot find module 'tesseract"));
    if (missing) {
      tesseractLoadError = Object.assign(
        new Error(
          'En el servidor falta el paquete tesseract.js. En la carpeta del backend (p. ej. TuSalud-Backend): git pull, luego npm ci o npm install, y reinicie Node. El PDF con texto embebido sigue funcionando sin esto.'
        ),
        { code: 'OCR_NOT_INSTALLED', statusCode: 503 }
      );
    } else {
      tesseractLoadError = e;
    }
    throw tesseractLoadError;
  }
}

/**
 * Escala de grises + contraste + ampliación para tablas escaneadas (mejora Tesseract en formularios).
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
async function preprocessImagenParaOcr(buffer) {
  try {
    const Jimp = require('jimp');
    const image = await Jimp.read(buffer);
    image.greyscale().contrast(0.2);
    const w = image.bitmap.width;
    const target = 2400;
    if (w > 0 && w < target) {
      const factor = Math.min(3, Math.ceil(target / w));
      if (factor > 1) image.scale(factor);
    }
    return image.getBufferAsync(Jimp.MIME_PNG);
  } catch (e) {
    console.warn('[ocr] preprocesado jimp omitido:', e?.message || e);
    return buffer;
  }
}

/**
 * OCR para JPG/PNG/WebP/GIF. Idiomas spa+eng.
 * PSM 4 = columna única / texto variable (tablas en imagen tras preprocesado).
 * @param {Buffer} buffer
 */
async function extraerTextoOcrImagen(buffer) {
  const proc = await preprocessImagenParaOcr(buffer);
  const { createWorker } = getTesseractJs();
  const worker = await createWorker('spa+eng');
  try {
    const {
      data: { text },
    } = await worker.recognize(proc, {
      tessedit_pageseg_mode: 4,
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
    if (err && (err.code === 'OCR_NOT_INSTALLED' || err.statusCode === 503)) {
      return res.status(503).json({ error: err.message || 'OCR no disponible en el servidor.' });
    }
    const message = err.message || 'Error al leer el archivo';
    return res.status(500).json({ error: message });
  }
}

module.exports = { extraerPdfTextoEmbebido };
