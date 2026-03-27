/**
 * OCR de imágenes (JPG/PNG/WebP) con Tesseract CLI (mismo requisito que PDF escaneado).
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function tesseractCmd() {
  return process.platform === 'win32' ? 'tesseract.exe' : 'tesseract';
}

async function commandExists(cmd) {
  try {
    const check = process.platform === 'win32' ? 'where' : 'which';
    await execFileAsync(check, [cmd], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} mimeType
 * @returns {string} extensión con punto
 */
function extFromMime(mimeType) {
  const m = (mimeType || '').toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
  if (m.includes('png')) return '.png';
  if (m.includes('webp')) return '.webp';
  if (m.includes('gif')) return '.gif';
  return '.png';
}

/**
 * @param {Buffer} buffer
 * @param {{ mimeType?: string }} [opts]
 * @returns {Promise<string>}
 */
async function extractTextFromImageBuffer(buffer, opts = {}) {
  const hasTess = await commandExists(tesseractCmd());
  if (!hasTess) {
    throw new Error(
      'OCR no disponible en el servidor. Instale Tesseract (p. ej. tesseract-ocr y tesseract-ocr-spa en Linux).'
    );
  }

  const ext = extFromMime(opts.mimeType || '');
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tusalud-img-'));
  const imgPath = path.join(tmpRoot, `upload${ext}`);

  try {
    await fs.writeFile(imgPath, buffer);
    const tess = tesseractCmd();
    const tessArgsBase = ['--oem', '1', '--psm', '3', '-c', 'preserve_interword_spaces=1'];
    let stdout = '';
    let lastErr;
    for (const lang of ['spa+eng', 'eng']) {
      try {
        const out = await execFileAsync(
          tess,
          [imgPath, 'stdout', '-l', lang, ...tessArgsBase],
          {
            encoding: 'utf8',
            timeout: 120000,
            maxBuffer: 20 * 1024 * 1024,
          }
        );
        stdout = out.stdout || '';
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr) throw lastErr;
    return (stdout || '').trim();
  } finally {
    try {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  extractTextFromImageBuffer,
  commandExists,
  tesseractCmd,
};
