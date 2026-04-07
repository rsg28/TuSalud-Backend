/**
 * Extrae texto tipo tabla desde PDF para reutilizar parseEmpleadosFile en el frontend.
 *
 * Requisitos en el servidor (Linux / EC2) para PDF escaneado o sin capa de texto:
 *   sudo apt-get install -y poppler-utils tesseract-ocr tesseract-ocr-spa
 *
 * PDF con texto seleccionable: solo usa pdf-parse (sin binarios).
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const DEFAULT_MAX_PAGES = parseInt(process.env.PDF_IMPORT_MAX_PAGES || '150', 10);
const OCR_DPI = parseInt(process.env.PDF_IMPORT_OCR_DPI || '200', 10);

function isPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-';
}

function splitNombreYMarcasEmoDerecha(right) {
  const toks = right.split(/\s+/).filter(Boolean);
  if (toks.length === 0) return [''];
  const emoTok = (s) => /^[xX]$|^-+$/.test(s);
  let splitAt = toks.length;
  for (let j = toks.length - 1; j >= 0; j--) {
    if (emoTok(toks[j])) splitAt = j;
    else break;
  }
  if (splitAt === toks.length) {
    return [right.trim()];
  }
  const nombre = toks.slice(0, splitAt).join(' ').trim();
  const marks = toks.slice(splitAt);
  return [nombre, ...marks];
}

function intentarFilaEncabezadoPlantillaTuSaludEmo(line) {
  const t = line.trim();
  if (!t || /(?<!\d)(\d{8,9})(?!\d)/.test(t)) return null;
  const m = t.match(/^(.+?)\s+(DNI|Documento)\s+(.+)$/i);
  if (!m) return null;
  const left = m[1].trim();
  const right = m[3].trim();
  const lt = left.split(/\s+/).filter(Boolean);
  if (lt.length < 2) return null;
  const n = lt[0];
  const perfil = lt.length >= 2 ? lt[lt.length - 1] : '';
  const puesto = lt.length >= 3 ? lt.slice(1, -1).join(' ') : '';
  const tokens = right.split(/\s+/).filter(Boolean);
  const kws = ['preoc', 'anual', 'retiro', 'visita', 'evaluaciones', 'condicionales', 'adicional'];
  let iEmo = tokens.findIndex((tok) => {
    const u = tok.toLowerCase();
    return kws.some((k) => u.startsWith(k));
  });
  if (iEmo < 0) iEmo = tokens.length;
  const nombreHeader = tokens.slice(0, iEmo).join(' ');
  const emoHeaders = tokens.slice(iEmo);
  return [n, puesto, perfil, 'DNI', nombreHeader, ...emoHeaders].join('\t');
}

function intentarFilaDatosPlantillaTuSaludEmo(line) {
  const t = line.trim();
  if (!t || /\bDNI\b/i.test(t)) return null;
  const compact = t.match(/^(\d+)prueba\s+(\d{8,9})(.*)$/i);
  if (compact) {
    const n = compact[1];
    const dni = compact[2];
    const rest = (compact[3] || '').trim();
    const puesto = '';
    const perfil = 'prueba';
    const partsRight = splitNombreYMarcasEmoDerecha(rest);
    return [n, puesto, perfil, dni, ...partsRight].join('\t');
  }
  const dniM = t.match(/(?<!\d)(\d{8,9})(?!\d)/);
  if (!dniM || dniM.index === undefined) return null;
  const dni = dniM[1];
  const idx = dniM.index;
  const left = t.slice(0, idx).trim();
  const right = t.slice(idx + dni.length).trim();
  const leftTokens = left.split(/\s+/).filter(Boolean);
  if (leftTokens.length < 2) return null;
  let n;
  let puesto;
  let perfil;
  if (leftTokens.length === 2) {
    n = leftTokens[0];
    perfil = leftTokens[1];
    puesto = '';
  } else {
    n = leftTokens[0];
    perfil = leftTokens[leftTokens.length - 1];
    puesto = leftTokens.slice(1, -1).join(' ');
  }
  const partsRight = splitNombreYMarcasEmoDerecha(right);
  return [n, puesto, perfil, dni, ...partsRight].join('\t');
}

function expandirCabeceraCompactaTuSalud(line) {
  const t = line.trim();
  if (!t) return line;
  const compact = t.replace(/\s+/g, '');
  if (/N°.*Perfil.*DNI.*Nombres/i.test(compact)) {
    return 'N°\t\tPuesto de trabajo\tPerfil\tDNI\tNombres completos';
  }
  return line;
}

function unirLineasNumeroPruebaPartido(text) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const next = lines[i + 1];
    if (next && /^\d{1,4}$/.test(L) && /^prueba\s+/i.test(next)) {
      out.push(`${L}${next}`);
      i++;
      continue;
    }
    out.push(L);
  }
  return out.join('\n');
}

function unirLineasRegistroEmoPdfCompacto(text) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const out = [];
  let buf = '';
  const reStart = /^\d+prueba\s+/i;
  const reComplete = /\bx\s*$/i;
  const reDniOnly = /^\d+prueba\s+\d{8,9}\s*$/i;

  for (const line of lines) {
    if (reStart.test(line)) {
      if (buf) out.push(buf);
      buf = line;
      continue;
    }
    if (buf) {
      if (reDniOnly.test(buf.trim())) {
        buf = `${buf} ${line}`;
      } else if (!reComplete.test(buf.trim())) {
        buf = `${buf} ${line}`;
      } else {
        out.push(buf);
        out.push(line);
        buf = '';
      }
    } else {
      out.push(line);
    }
  }
  if (buf) out.push(buf);
  return out.join('\n');
}

/** pdf-parse suele partir la cabecera en dos líneas: «… Perfil» y «DNI Nombres…». */
function unirLineasCabeceraPdfTuSalud(text) {
  const raw = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const L = raw[i];
    const next = raw[i + 1];
    if (
      next &&
      !/(?<!\d)(\d{8,9})(?!\d)/.test(L) &&
      !/\bDNI\b/i.test(L) &&
      !/\bDocumento\b/i.test(L) &&
      (/\bDNI\b/i.test(next) || /\bDocumento\b/i.test(next)) &&
      L.length < 220 &&
      next.length < 400
    ) {
      out.push(`${L} ${next}`);
      i++;
      continue;
    }
    out.push(L);
  }
  return out.join('\n');
}

function lineaPareceEncabezadoTuSaludMapeado(line) {
  const t = line.trim();
  if (intentarFilaEncabezadoPlantillaTuSaludEmo(t) !== null) return true;
  if (!t.includes('\t')) return false;
  const cells = t.split('\t').map((c) => c.trim());
  if (cells.length < 4) return false;
  const joined = cells.join(' ').toLowerCase();
  return /\bdni\b/.test(joined) && /nombres/.test(joined) && /perfil/.test(joined);
}

/** Si hay filas de datos TuSalud pero no una cabecera reconocible, antepone una fila de títulos. */
function prependEncabezadoTuSaludSiHayFilasDatos(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return text;
  const tieneHeaderParseado = lines.some(
    (l) => intentarFilaEncabezadoPlantillaTuSaludEmo(l) !== null || lineaPareceEncabezadoTuSaludMapeado(l)
  );
  if (tieneHeaderParseado) return text;
  const lineasDatos = lines.filter((l) => intentarFilaDatosPlantillaTuSaludEmo(l) !== null);
  if (lineasDatos.length < 1) return text;
  const primera = intentarFilaDatosPlantillaTuSaludEmo(lineasDatos[0]);
  const nCols = primera.split('\t').length;
  const base = ['N°', 'Puesto de trabajo', 'Perfil', 'DNI', 'Nombres completos'];
  const extras = ['PREOC', 'ANUAL', 'RETIRO', 'VISITA', 'Evaluaciones adicionales / condicionales'];
  while (base.length < nCols) {
    const ei = base.length - 5;
    base.push(extras[ei] ?? `Columna ${base.length + 1}`);
  }
  return [base.join('\t'), ...lines].join('\n');
}

function promoverEncabezadoTuSaludAntesDePrimerDato(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return text;
  const firstDataIdx = lines.findIndex((l) => intentarFilaDatosPlantillaTuSaludEmo(l) !== null);
  if (firstDataIdx < 0) return text;
  const headerIdx = lines.findIndex(
    (l) =>
      lineaPareceEncabezadoTuSaludMapeado(l) || intentarFilaEncabezadoPlantillaTuSaludEmo(l) !== null
  );
  if (headerIdx < 0 || headerIdx <= firstDataIdx) return text;
  const header = lines[headerIdx];
  const without = lines.filter((_, i) => i !== headerIdx);
  const insertAt = Math.min(firstDataIdx, without.length);
  without.splice(insertAt, 0, header);
  return without.join('\n');
}

/**
 * Convierte líneas con columnas separadas por espacios múltiples (típico OCR/PDF) a tabs
 * para que parseEmpleadosFile detecte columnas igual que en Excel/CSV.
 * Los PDF de plantilla EMO suelen tener DNI de 8 dígitos rodeado de espacios simples.
 */
function normalizeExtractedTableText(text) {
  const pre = unirLineasRegistroEmoPdfCompacto(unirLineasNumeroPruebaPartido(text));
  const unido = unirLineasCabeceraPdfTuSalud(pre);
  const mapped = unido
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => {
      let t = line.trim();
      if (!t) return '';
      t = expandirCabeceraCompactaTuSalud(t);
      const tuSaludH = intentarFilaEncabezadoPlantillaTuSaludEmo(t);
      if (tuSaludH) return tuSaludH;
      const tuSaludD = intentarFilaDatosPlantillaTuSaludEmo(t);
      if (tuSaludD) return tuSaludD;
      if (t.includes('\t')) return t;
      const commaCols = t.split(',').length;
      const semiCols = t.split(';').length;
      if (commaCols >= 4 || semiCols >= 4) return t;
      let spaced = t.replace(/\s{2,}/g, '\t');
      if (!spaced.includes('\t') && /(?<!\d)(\d{8,9})(?!\d)/.test(spaced)) {
        spaced = spaced
          .replace(/\s+(\d{8,9})\s+/g, '\t$1\t')
          .replace(/\s{2,}/g, '\t');
      }
      if (!spaced.includes('\t')) {
        spaced = spaced.replace(/\s{2,}/g, '\t');
      }
      return spaced;
    })
    .join('\n');
  return promoverEncabezadoTuSaludAntesDePrimerDato(prependEncabezadoTuSaludSiHayFilasDatos(mapped));
}

function isLikelyUsableTableText(text) {
  const compact = (text || '').replace(/\s+/g, ' ').trim();
  if (compact.length < 80) return false;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.length >= 2;
}

async function extractWithPdfParse(buffer) {
  // eslint-disable-next-line global-require
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return {
    text: (data.text || '').trim(),
    numpages: data.numpages || 0,
  };
}

function tesseractCmd() {
  return process.platform === 'win32' ? 'tesseract.exe' : 'tesseract';
}

function pdftoppmCmd() {
  return process.platform === 'win32' ? 'pdftoppm.exe' : 'pdftoppm';
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

async function extractPagesWithOcr(pdfPath, tmpDir, maxPages) {
  const prefix = path.join(tmpDir, 'page');
  const ppm = pdftoppmCmd();
  const tess = tesseractCmd();

  await execFileAsync(ppm, ['-png', '-r', String(OCR_DPI), pdfPath, prefix], {
    timeout: 120000,
    maxBuffer: 20 * 1024 * 1024,
  });

  const entries = await fs.readdir(tmpDir);
  const pngs = entries
    .filter((f) => f.endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (pngs.length === 0) {
    throw new Error('No se generaron imágenes del PDF (¿poppler instalado?).');
  }

  const toRead = pngs.slice(0, maxPages);
  const parts = [];

  const tessArgsBase = ['--oem', '1', '--psm', '6', '-c', 'preserve_interword_spaces=1'];

  for (const png of toRead) {
    const imgPath = path.join(tmpDir, png);
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
    if (stdout.trim()) parts.push(stdout.trim());
  }

  return parts.join('\n\n');
}

/**
 * @param {Buffer} buffer
 * @param {{ maxPages?: number }} [opts]
 * @returns {Promise<{ text: string, mode: 'pdf-text' | 'ocr' }>}
 */
async function extractEmpleadosTextFromPdfBuffer(buffer, opts = {}) {
  if (!isPdfBuffer(buffer)) {
    throw new Error('El archivo no es un PDF válido.');
  }

  const maxPages = Number.isFinite(opts.maxPages) ? opts.maxPages : DEFAULT_MAX_PAGES;

  let pdfText = '';
  let numpages = 0;
  try {
    const parsed = await extractWithPdfParse(buffer);
    pdfText = parsed.text;
    numpages = parsed.numpages;
  } catch {
    pdfText = '';
    numpages = 0;
  }

  if (numpages > 0 && numpages > maxPages) {
    throw new Error(
      `El PDF tiene ${numpages} páginas; el máximo permitido es ${maxPages}. Divida el archivo o suba menos páginas.`
    );
  }

  if (isLikelyUsableTableText(pdfText)) {
    return {
      text: normalizeExtractedTableText(pdfText),
      mode: 'pdf-text',
    };
  }

  const hasPpm = await commandExists(pdftoppmCmd());
  const hasTess = await commandExists(tesseractCmd());
  if (!hasPpm || !hasTess) {
    throw new Error(
      'Este PDF no tiene texto seleccionable legible. En el servidor hace falta OCR: instale poppler-utils y tesseract-ocr (y tesseract-ocr-spa).'
    );
  }

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tusalud-pdf-'));
  const pdfPath = path.join(tmpRoot, 'upload.pdf');
  try {
    await fs.writeFile(pdfPath, buffer);
    const rawOcr = await extractPagesWithOcr(pdfPath, tmpRoot, maxPages);
    if (!rawOcr || rawOcr.replace(/\s/g, '').length < 40) {
      throw new Error('No se pudo leer texto del PDF con OCR. Revise la calidad del escaneo.');
    }
    return {
      text: normalizeExtractedTableText(rawOcr),
      mode: 'ocr',
    };
  } finally {
    try {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  extractEmpleadosTextFromPdfBuffer,
  normalizeExtractedTableText,
  DEFAULT_MAX_PAGES,
};
