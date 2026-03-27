/**
 * Pipeline: PDF o imagen → texto (pdf-parse / OCR) → inferencia de campos → texto listo para import en cliente.
 */

const { extractEmpleadosTextFromPdfBuffer, normalizeExtractedTableText, DEFAULT_MAX_PAGES } = require('./pdfEmpleadosExtract');
const { extractTextFromImageBuffer } = require('./imageOcrExtract');
const { inferCamposDesdeTexto, elegirTextoParaImportacion } = require('./documentFieldsInfer');

function isPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-';
}

function isImageMime(mime) {
  const m = (mime || '').toLowerCase();
  return (
    m === 'image/jpeg' ||
    m === 'image/jpg' ||
    m === 'image/png' ||
    m === 'image/webp'
  );
}

function isImageFilename(name) {
  return /\.(jpe?g|png|webp)$/i.test(name || '');
}

/**
 * @param {Buffer} buffer
 * @param {{ mimetype?: string, originalname?: string, maxPages?: number }} [opts]
 * @returns {Promise<{ text: string, mode: string, extracted: object, textoParaImportar: string }>}
 */
async function procesarDocumentoParaImport(buffer, opts = {}) {
  const mime = (opts.mimetype || '').toLowerCase();
  const orig = opts.originalname || '';
  let text = '';
  let mode = 'unknown';

  if (isPdfBuffer(buffer)) {
    const r = await extractEmpleadosTextFromPdfBuffer(buffer, { maxPages: opts.maxPages ?? DEFAULT_MAX_PAGES });
    text = r.text || '';
    mode = r.mode || 'pdf';
  } else if (isImageMime(mime) || isImageFilename(orig)) {
    const r = await extractTextFromImageBuffer(buffer, { mimeType: mime || 'image/png' });
    text = r || '';
    mode = 'ocr-image';
  } else {
    throw new Error('Formato no soportado. Use PDF o imagen (JPEG, PNG, WebP).');
  }

  if (!text || text.replace(/\s/g, '').length < 8) {
    throw new Error('No se obtuvo texto legible. Mejore la iluminación o la resolución del documento.');
  }

  const extracted = inferCamposDesdeTexto(text);
  const textoParaImportar = elegirTextoParaImportacion(extracted, normalizeExtractedTableText(text));

  return {
    text,
    mode,
    extracted,
    textoParaImportar,
  };
}

module.exports = {
  procesarDocumentoParaImport,
  isImageMime,
  isImageFilename,
  isPdfBuffer,
};
