const { extractEmpleadosTextFromPdfBuffer, DEFAULT_MAX_PAGES } = require('../services/pdfEmpleadosExtract');

/**
 * POST multipart/form-data campo "file" — PDF con tabla de empleados.
 * Devuelve texto normalizado para parseEmpleadosFile en el cliente.
 */
async function procesarPdfEmpleados(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Adjunte un archivo PDF (campo file).' });
    }

    const maxPages = DEFAULT_MAX_PAGES;
    const { text, mode } = await extractEmpleadosTextFromPdfBuffer(req.file.buffer, { maxPages });

    if (!text || text.trim().length === 0) {
      return res.status(422).json({ error: 'No se extrajo texto del PDF.' });
    }

    return res.json({
      text,
      mode,
      maxPages,
    });
  } catch (err) {
    console.error('[import PDF empleados]', err);
    const message = err.message || 'Error al procesar el PDF';
    const lower = message.toLowerCase();
    if (lower.includes('máximo') || lower.includes('maximo') || lower.includes('páginas')) {
      return res.status(400).json({ error: message });
    }
    if (lower.includes('no es un pdf')) {
      return res.status(400).json({ error: message });
    }
    if (lower.includes('instale') || lower.includes('poppler') || lower.includes('tesseract')) {
      return res.status(503).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
}

module.exports = { procesarPdfEmpleados };
