/**
 * Extrae tablas de un PDF de perfil EMO sin Python (pdf.js / pdfjs-dist).
 * Replica la lógica de scripts/extract_perfil_pdf_tables.py: texto con posiciones,
 * rejilla por huecos, y división en Principal / Adicionales / Condicional.
 */

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

const ROW_Y_TOL = 4;
const MERGE_GAP = 2;
/** Hueco mínimo entre trozos de texto para considerar nueva columna (unidades PDF). Ajustable con PDF_PERFIL_CELL_GAP. */
const CELL_GAP_MIN = Math.max(6, parseInt(process.env.PDF_PERFIL_CELL_GAP || '12', 10) || 12);

function normalizeCell(s) {
  return String(s || '')
    .replace(/\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimTrailingEmptyRows(matrix) {
  const m = matrix.slice();
  while (m.length && m[m.length - 1].every((c) => !normalizeCell(c))) {
    m.pop();
  }
  return m;
}

function findRowIndex(matrix, predicate) {
  for (let i = 0; i < matrix.length; i++) {
    if (predicate(matrix[i], i)) return i;
  }
  return -1;
}

function findRowIndexFrom(matrix, start, predicate) {
  for (let i = Math.max(0, start); i < matrix.length; i++) {
    if (predicate(matrix[i], i)) return i;
  }
  return -1;
}

/**
 * Agrupa ítems de getTextContent en filas (misma línea base) y luego en celdas por hueco horizontal.
 * @param {import('pdfjs-dist').TextContent} textContent
 * @returns {string[][]}
 */
function textContentToMatrix(textContent) {
  const raw = (textContent.items || []).filter((it) => it.str && String(it.str).trim() !== '');
  if (raw.length === 0) return [];

  const items = raw.map((it) => {
    const m = it.transform;
    const x = m[4];
    const y = m[5];
    const w = typeof it.width === 'number' ? it.width : Math.abs(m[0]) * String(it.str).length * 0.5 || 5;
    return { str: String(it.str), x, y, x2: x + w };
  });

  items.sort((a, b) => {
    if (Math.abs(a.y - b.y) > ROW_Y_TOL) return b.y - a.y;
    return a.x - b.x;
  });

  /** @type {typeof items[]} */
  const rowBuckets = [];
  for (const it of items) {
    let placed = false;
    for (const bucket of rowBuckets) {
      const ref = bucket[0];
      if (Math.abs(it.y - ref.y) <= ROW_Y_TOL) {
        bucket.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) rowBuckets.push([it]);
  }

  rowBuckets.sort((a, b) => b[0].y - a[0].y);

  /** @type {string[][]} */
  const matrix = [];

  for (const bucket of rowBuckets) {
    bucket.sort((a, b) => a.x - b.x);
    const merged = [];
    let cur = { ...bucket[0] };
    for (let i = 1; i < bucket.length; i++) {
      const n = bucket[i];
      const gap = n.x - cur.x2;
      if (gap <= MERGE_GAP) {
        cur.str += n.str;
        cur.x2 = Math.max(cur.x2, n.x2);
      } else {
        merged.push(cur);
        cur = { ...n };
      }
    }
    merged.push(cur);

    const cells = [];
    let buf = merged[0].str;
    for (let i = 1; i < merged.length; i++) {
      const gap = merged[i].x - merged[i - 1].x2;
      if (gap >= CELL_GAP_MIN) {
        cells.push(normalizeCell(buf));
        buf = merged[i].str;
      } else {
        buf += ` ${merged[i].str}`;
      }
    }
    cells.push(normalizeCell(buf));

    if (cells.some((c) => c.length > 0)) {
      matrix.push(cells);
    }
  }

  const maxCols = matrix.reduce((m, r) => Math.max(m, r.length), 0);
  return matrix.map((r) => {
    const row = r.slice();
    while (row.length < maxCols) row.push('');
    return row;
  });
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<{ ok: boolean, numpages: number, tables: object[], error?: string }>}
 */
async function extractPerfilPdfTablesFromBuffer(buffer) {
  // pdf.js exige Uint8Array (no Buffer) en Node.
  const data = Buffer.isBuffer(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  try {
    const numpages = pdf.numPages || 0;
    if (numpages < 1) {
      return { ok: true, numpages: 0, tables: [], meta: { note: 'PDF sin páginas.' } };
    }

    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
    let matrix = textContentToMatrix(textContent);
    matrix = trimTrailingEmptyRows(matrix);

    if (matrix.length === 0) {
      return { ok: true, numpages, tables: [], meta: { note: 'No se detectó texto en la primera página.' } };
    }

    const adicIdx = findRowIndex(matrix, (row) =>
      row.some((c) => normalizeCell(c).toUpperCase() === 'ADICIONALES')
    );
    const condIdx =
      adicIdx >= 0
        ? findRowIndexFrom(matrix, adicIdx + 1, (row) =>
            row.some((c) => normalizeCell(c).toUpperCase() === 'CONDICIONAL')
          )
        : -1;

    /** @type {object[]} */
    const tables = [];

    if (adicIdx > 0) {
      const principal = trimTrailingEmptyRows(matrix.slice(0, adicIdx));

      if (condIdx > adicIdx) {
        const adicionales = trimTrailingEmptyRows(matrix.slice(adicIdx, condIdx));
        const condicional = trimTrailingEmptyRows(matrix.slice(condIdx));
        tables.push(
          {
            id: 1,
            nombre: 'Principal (exámenes y primer precio)',
            filas: principal.length,
            columnas: maxColsOf(principal),
            celdas: principal,
          },
          {
            id: 2,
            nombre: 'Adicionales',
            filas: adicionales.length,
            columnas: maxColsOf(adicionales),
            celdas: adicionales,
          },
          {
            id: 3,
            nombre: 'Condicional',
            filas: condicional.length,
            columnas: maxColsOf(condicional),
            celdas: condicional,
          }
        );
      } else {
        const restAfterAdic = matrix.slice(adicIdx);
        tables.push(
          {
            id: 1,
            nombre: 'Principal (exámenes y primer precio)',
            filas: principal.length,
            columnas: maxColsOf(principal),
            celdas: principal,
          },
          {
            id: 2,
            nombre: 'Adicionales',
            filas: restAfterAdic.length,
            columnas: maxColsOf(restAfterAdic),
            celdas: restAfterAdic,
          }
        );
      }
    } else {
      tables.push({
        id: 1,
        nombre: 'Documento (tabla 1)',
        filas: matrix.length,
        columnas: maxColsOf(matrix),
        celdas: matrix,
      });
    }

    return { ok: true, numpages, tables };
  } finally {
    try {
      await pdf.cleanup(false);
    } catch (_) {
      /* ignore */
    }
    try {
      await pdf.destroy();
    } catch (_) {
      /* ignore */
    }
  }
}

function maxColsOf(m) {
  return m.reduce((n, r) => Math.max(n, r.length), 0);
}

module.exports = { extractPerfilPdfTablesFromBuffer, textContentToMatrix };
