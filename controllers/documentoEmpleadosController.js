const { procesarDocumentoParaImport } = require('../services/documentoEmpleadosOcr');
const { DEFAULT_MAX_PAGES } = require('../services/pdfEmpleadosExtract');

/**
 * POST multipart/form-data campo "file" — PDF o imagen (JPEG/PNG/WebP).
 * OCR + inferencia de campos (DNI, nombre, fecha, montos tipo cotización).
 * Devuelve texto listo para import en el cliente (parseEmpleadosFile / mapeo).
 */
async function procesarDocumentoEmpleados(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Adjunte un archivo (campo file).' });
    }

    const maxPages = DEFAULT_MAX_PAGES;
    const { text, mode, extracted, textoParaImportar } = await procesarDocumentoParaImport(req.file.buffer, {
      mimetype: req.file.mimetype || '',
      originalname: req.file.originalname || '',
      maxPages,
    });

    if (!textoParaImportar || textoParaImportar.replace(/\s/g, '').length < 4) {
      return res.status(422).json({ error: 'No se generó texto importable a partir del documento.' });
    }

    return res.json({
      text,
      mode,
      extracted,
      textoParaImportar,
      maxPages,
    });
  } catch (err) {
    console.error('[import documento empleados]', err);
    const message = err.message || 'Error al procesar el documento';
    const lower = message.toLowerCase();
    if (lower.includes('máximo') || lower.includes('maximo') || lower.includes('páginas')) {
      return res.status(400).json({ error: message });
    }
    if (lower.includes('no es un pdf') || lower.includes('formato no soportado')) {
      return res.status(400).json({ error: message });
    }
    if (lower.includes('instale') || lower.includes('poppler') || lower.includes('tesseract') || lower.includes('ocr no disponible')) {
      return res.status(503).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
}

module.exports = { procesarDocumentoEmpleados };
