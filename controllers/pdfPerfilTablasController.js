const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

function isPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-';
}

function resolvePythonCandidates() {
  const fromEnv = process.env.PYTHON_PATH || process.env.PYTHON;
  if (fromEnv && String(fromEnv).trim()) {
    return [[String(fromEnv).trim(), []]];
  }
  return [
    ['python', []],
    ['py', ['-3']],
  ];
}

/**
 * Ejecuta scripts/extract_perfil_pdf_tables.py (PyMuPDF). Requiere: pip install pymupdf
 * @param {string} scriptPath
 * @param {string} pdfPath
 * @returns {{ status: number|null, stdout: string, stderr: string, error?: Error }}
 */
function runExtractScript(scriptPath, pdfPath) {
  const timeoutMs = Math.max(15000, parseInt(process.env.PDF_PERFIL_PYTHON_TIMEOUT_MS || '90000', 10) || 90000);
  const maxBuf = 50 * 1024 * 1024;

  for (const [cmd, prefixArgs] of resolvePythonCandidates()) {
    const args = [...prefixArgs, scriptPath, pdfPath];
    const r = spawnSync(cmd, args, {
      encoding: 'utf8',
      maxBuffer: maxBuf,
      timeout: timeoutMs,
      windowsHide: true,
    });
    if (r.error && r.error.code === 'ENOENT') {
      continue;
    }
    return {
      status: r.status,
      stdout: r.stdout || '',
      stderr: r.stderr || '',
      error: r.error || null,
    };
  }
  return {
    status: null,
    stdout: '',
    stderr: '',
    error: Object.assign(new Error('No se encontró el intérprete Python (python / py -3).'), {
      code: 'PYTHON_NOT_FOUND',
    }),
  };
}

/**
 * POST JSON `{ file_base64 }` — solo PDF. Devuelve tablas extraídas con PyMuPDF en Python.
 */
function extraerPdfPerfilTablas(req, res) {
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

    const scriptPath = path.join(__dirname, '..', 'scripts', 'extract_perfil_pdf_tables.py');
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ error: 'Script de extracción no encontrado en el servidor.' });
    }

    const tmp = path.join(os.tmpdir(), `tusalud-perfil-${crypto.randomBytes(8).toString('hex')}.pdf`);
    fs.writeFileSync(tmp, buffer);

    let run;
    try {
      run = runExtractScript(scriptPath, tmp);
    } finally {
      try {
        fs.unlinkSync(tmp);
      } catch (_) {
        /* ignore */
      }
    }

    if (run.error && run.error.code === 'PYTHON_NOT_FOUND') {
      return res.status(503).json({
        error:
          'Python no está disponible en el servidor. Instale Python 3 y pymupdf (pip install pymupdf), o defina PYTHON_PATH.',
      });
    }
    if (run.error) {
      console.error('[pdf-perfil-tablas] spawn', run.error);
      return res.status(500).json({ error: run.error.message || 'Error al ejecutar Python.' });
    }

    if (run.status !== 0) {
      const hint = (run.stderr || '').trim() || (run.stdout || '').trim();
      console.error('[pdf-perfil-tablas] exit', run.status, hint.slice(0, 500));
      return res.status(503).json({
        error: hint || `El script Python terminó con código ${run.status}. ¿Está instalado pymupdf? (pip install pymupdf)`,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(run.stdout);
    } catch (e) {
      console.error('[pdf-perfil-tablas] JSON inválido', (run.stdout || '').slice(0, 400));
      return res.status(500).json({ error: 'Respuesta inválida del extractor de tablas.' });
    }

    if (parsed && parsed.ok === false && parsed.error) {
      return res.status(400).json({ error: String(parsed.error) });
    }

    return res.json(parsed);
  } catch (err) {
    console.error('[pdf-perfil-tablas]', err);
    return res.status(500).json({ error: err.message || 'Error al procesar el PDF.' });
  }
}

module.exports = { extraerPdfPerfilTablas };
