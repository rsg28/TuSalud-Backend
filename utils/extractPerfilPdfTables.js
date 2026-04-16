const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

const ROW_Y_TOL = 4;
const INLINE_MERGE_GAP = 2;
const LEFT_COLS = 3;
const RIGHT_CENTER_CLUSTER_GAP = 15;
const MIN_RIGHT_CLUSTER_HITS = 3;

function normalizeCell(s) {
  return String(s || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function trimTrailingEmptyRows(matrix) {
  const out = matrix.slice();
  while (out.length && out[out.length - 1].every((c) => !normalizeCell(c))) out.pop();
  return out;
}

function cluster1D(values, gap) {
  const s = [...values].sort((a, b) => a - b);
  const groups = [];
  for (const v of s) {
    const g = groups[groups.length - 1];
    if (!g || v - g[g.length - 1] > gap) groups.push([v]);
    else g.push(v);
  }
  return groups.map((g) => ({ center: g.reduce((a, b) => a + b, 0) / g.length, size: g.length }));
}

function nearestCenter(x, centers) {
  let idx = 0;
  let dist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < centers.length; i++) {
    const d = Math.abs(x - centers[i]);
    if (d < dist) {
      dist = d;
      idx = i;
    }
  }
  return { idx, dist };
}

function parseItems(textContent) {
  return (textContent.items || [])
    .filter((it) => it.str && String(it.str).trim() !== '')
    .map((it) => {
      const m = it.transform || [];
      const x = m[4] || 0;
      const y = m[5] || 0;
      const w = typeof it.width === 'number' ? it.width : Math.abs(m[0] || 0) * String(it.str).length * 0.5 || 5;
      const str = String(it.str);
      return { str, x, y, w, x2: x + w, xmid: x + w / 2 };
    });
}

function bucketRows(items) {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > ROW_Y_TOL) return b.y - a.y;
    return a.x - b.x;
  });
  const buckets = [];
  for (const it of sorted) {
    let placed = false;
    for (const row of buckets) {
      if (Math.abs(it.y - row.y) <= ROW_Y_TOL) {
        row.items.push(it);
        row.sumY += it.y;
        row.count += 1;
        row.y = row.sumY / row.count;
        placed = true;
        break;
      }
    }
    if (!placed) buckets.push({ y: it.y, sumY: it.y, count: 1, items: [it] });
  }
  for (const r of buckets) r.items.sort((a, b) => a.x - b.x);
  buckets.sort((a, b) => b.y - a.y);
  return buckets;
}

function inferRightCenters(items) {
  const candidates = [];
  for (const it of items) {
    const t = normalizeCell(it.str);
    if (!t) continue;
    const isMark = /^[xX]$/.test(t);
    const isMoney = /^S\/\s*\d/i.test(t);
    const shortNoSpace = t.length <= 18 && !/\s/.test(t) && it.w <= 45;
    if (isMark || isMoney || shortNoSpace) candidates.push(it.xmid);
  }
  if (!candidates.length) return null;
  const clusters = cluster1D(candidates, RIGHT_CENTER_CLUSTER_GAP)
    .filter((c) => c.size >= MIN_RIGHT_CLUSTER_HITS)
    .sort((a, b) => a.center - b.center);
  if (!clusters.length) return null;
  return clusters.map((c) => c.center);
}

function mergeLeftSegmentsToN(items, n = LEFT_COLS) {
  if (!items.length) return Array.from({ length: n }, () => '');
  const merged = [];
  let cur = { ...items[0] };
  for (let i = 1; i < items.length; i++) {
    const nx = items[i];
    if (nx.x - cur.x2 <= INLINE_MERGE_GAP) {
      cur.str += String(nx.str).startsWith(' ') ? nx.str : ` ${nx.str}`;
      cur.x2 = Math.max(cur.x2, nx.x2);
    } else {
      merged.push(cur);
      cur = { ...nx };
    }
  }
  merged.push(cur);
  const parts = merged.map((m) => normalizeCell(m.str));
  if (parts.length <= n) {
    while (parts.length < n) parts.push('');
    return parts;
  }
  return [...parts.slice(0, n - 1), parts.slice(n - 1).join(' ')];
}

function gridifyRows(rowBuckets, rightCenters) {
  if (!rightCenters || !rightCenters.length) {
    return rowBuckets.map((r) => ({ y: r.y, cells: [normalizeCell(r.items.map((it) => it.str).join(' '))] }));
  }
  const sortedCenters = [...rightCenters].sort((a, b) => a - b);
  const gaps = sortedCenters.slice(1).map((c, i) => c - sortedCenters[i]);
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 48;
  const rightAssignDist = Math.max(16, avgGap * 0.48);
  const leftBoundary = sortedCenters[0] - Math.max(20, avgGap * 0.45);

  return rowBuckets.map((row) => {
    const right = Array.from({ length: sortedCenters.length }, () => '');
    const leftItems = [];
    for (const it of row.items) {
      const t = normalizeCell(it.str);
      if (!t) continue;
      const isMark = /^[xX]$/.test(t);
      const isMoney = /^S\/\s*\d/i.test(t);
      const shortValue = t.length <= 20 && it.w <= 60;
      if (isMark || isMoney || shortValue) {
        const { idx, dist } = nearestCenter(it.xmid, sortedCenters);
        if (dist <= rightAssignDist) {
          right[idx] = right[idx] ? `${right[idx]} ${t}` : t;
          continue;
        }
      }
      if (it.xmid < leftBoundary) leftItems.push(it);
      else leftItems.push(it);
    }
    const left = mergeLeftSegmentsToN(leftItems.sort((a, b) => a.x - b.x), LEFT_COLS);
    return { y: row.y, cells: [...left, ...right] };
  });
}

function splitRowBlocksByVerticalGaps(rows) {
  if (!rows.length) return [];
  const ys = rows.map((r) => r.y);
  const gaps = [];
  for (let i = 0; i < ys.length - 1; i++) gaps.push(ys[i] - ys[i + 1]);
  const baseline = median(gaps.filter((g) => g > 0 && g <= 15)) || median(gaps.filter((g) => g > 0)) || 8;
  const splitGap = Math.max(20, baseline * 2.8);
  const starts = [0];
  for (let i = 0; i < gaps.length; i++) if (gaps[i] > splitGap) starts.push(i + 1);
  const blocks = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : rows.length;
    blocks.push(rows.slice(from, to));
  }
  return blocks.filter((b) => b.length > 0);
}

function maxColsOf(matrix) {
  return matrix.reduce((n, r) => Math.max(n, r.length), 0);
}

function tableNameFromBlock(block, fallback) {
  if (!block.length) return fallback;
  const first = block[0].cells.slice(0, LEFT_COLS).map(normalizeCell).join(' ').trim();
  if (!first) return fallback;
  return first.length > 48 ? fallback : first.replace(/\s+/g, ' ');
}

async function extractPerfilPdfTablesFromBuffer(buffer) {
  const data = Buffer.isBuffer(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  const task = pdfjsLib.getDocument({ data, useSystemFonts: true, disableFontFace: true, isEvalSupported: false });
  const pdf = await task.promise;
  try {
    const numpages = pdf.numPages || 0;
    if (numpages < 1) return { ok: true, numpages: 0, tables: [] };
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
    const items = parseItems(textContent);
    if (!items.length) return { ok: true, numpages, tables: [] };
    const rows = bucketRows(items);
    const rightCenters = inferRightCenters(items);
    const gridRows = gridifyRows(rows, rightCenters);
    const blocks = splitRowBlocksByVerticalGaps(gridRows);
    const tables = blocks.map((b, i) => {
      const celdas = trimTrailingEmptyRows(b.map((r) => r.cells));
      return {
        id: i + 1,
        nombre: tableNameFromBlock(b, `Tabla ${i + 1}`),
        filas: celdas.length,
        columnas: maxColsOf(celdas),
        celdas,
      };
    });
    return { ok: true, numpages, tables };
  } finally {
    try {
      await pdf.cleanup(false);
    } catch (_) {}
    try {
      await pdf.destroy();
    } catch (_) {}
  }
}

module.exports = { extractPerfilPdfTablesFromBuffer };

/**
 * Extracción genérica de tablas desde texto PDF (pdfjs-dist), basada en geometría:
 * - filas por cercanía en Y
 * - columnas por centros X repetidos (distancias / tamaño de celdas)
 * - tablas distintas por saltos verticales entre bloques de filas
 *
 * No usa etiquetas fijas de contenido.
 */

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

const ROW_Y_TOL = 4;
const INLINE_MERGE_GAP = 2;
const LEFT_COLS = 3;
const RIGHT_CENTER_CLUSTER_GAP = 15;
const MIN_RIGHT_CLUSTER_HITS = 3;

function normalizeCell(s) {
  return String(s || '')
    .replace(/\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function trimTrailingEmptyRows(matrix) {
  const out = matrix.slice();
  while (out.length && out[out.length - 1].every((c) => !normalizeCell(c))) {
    out.pop();
  }
  return out;
}

function cluster1D(values, gap) {
  const s = [...values].sort((a, b) => a - b);
  const groups = [];
  for (const v of s) {
    const g = groups[groups.length - 1];
    if (!g || v - g[g.length - 1] > gap) groups.push([v]);
    else g.push(v);
  }
  return groups.map((g) => ({
    center: g.reduce((a, b) => a + b, 0) / g.length,
    size: g.length,
  }));
}

function nearestCenter(x, centers) {
  let idx = 0;
  let dist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < centers.length; i++) {
    const d = Math.abs(x - centers[i]);
    if (d < dist) {
      dist = d;
      idx = i;
    }
  }
  return { idx, dist };
}

function parseItems(textContent) {
  return (textContent.items || [])
    .filter((it) => it.str && String(it.str).trim() !== '')
    .map((it) => {
      const m = it.transform || [];
      const x = m[4] || 0;
      const y = m[5] || 0;
      const w = typeof it.width === 'number' ? it.width : Math.abs(m[0] || 0) * String(it.str).length * 0.5 || 5;
      const h = typeof it.height === 'number' ? it.height : Math.abs(m[3] || 0) || 6;
      const str = String(it.str);
      return { str, x, y, w, h, x2: x + w, xmid: x + w / 2 };
    });
}

function bucketRows(items) {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > ROW_Y_TOL) return b.y - a.y;
    return a.x - b.x;
  });

  const buckets = [];
  for (const it of sorted) {
    let placed = false;
    for (const row of buckets) {
      if (Math.abs(it.y - row.y) <= ROW_Y_TOL) {
        row.items.push(it);
        row.sumY += it.y;
        row.count += 1;
        row.y = row.sumY / row.count;
        placed = true;
        break;
      }
    }
    if (!placed) {
      buckets.push({ y: it.y, sumY: it.y, count: 1, items: [it] });
    }
  }

  for (const r of buckets) r.items.sort((a, b) => a.x - b.x);
  buckets.sort((a, b) => b.y - a.y);
  return buckets;
}

function inferRightCenters(items) {
  const candidates = [];
  for (const it of items) {
    const t = normalizeCell(it.str);
    if (!t) continue;
    const isMark = /^[xX]$/.test(t);
    const isMoney = /^S\/\s*\d/i.test(t);
    const shortNoSpace = t.length <= 18 && !/\s/.test(t) && it.w <= 45;
    if (isMark || isMoney || shortNoSpace) candidates.push(it.xmid);
  }
  if (!candidates.length) return null;

  const clusters = cluster1D(candidates, RIGHT_CENTER_CLUSTER_GAP)
    .filter((c) => c.size >= MIN_RIGHT_CLUSTER_HITS)
    .sort((a, b) => a.center - b.center);

  if (!clusters.length) return null;
  return clusters.map((c) => c.center);
}

function mergeLeftSegmentsToN(items, n = LEFT_COLS) {
  if (!items.length) return Array.from({ length: n }, () => '');
  const merged = [];
  let cur = { ...items[0] };
  for (let i = 1; i < items.length; i++) {
    const nx = items[i];
    if (nx.x - cur.x2 <= INLINE_MERGE_GAP) {
      cur.str += String(nx.str).startsWith(' ') ? nx.str : ` ${nx.str}`;
      cur.x2 = Math.max(cur.x2, nx.x2);
    } else {
      merged.push(cur);
      cur = { ...nx };
    }
  }
  merged.push(cur);

  const parts = merged.map((m) => normalizeCell(m.str));
  if (parts.length <= n) {
    while (parts.length < n) parts.push('');
    return parts;
  }
  const head = parts.slice(0, n - 1);
  const tail = parts.slice(n - 1).join(' ');
  return [...head, tail];
}

function gridifyRows(rowBuckets, rightCenters) {
  if (!rightCenters || rightCenters.length === 0) {
    // Fallback mínimo: todo a la izquierda.
    return rowBuckets.map((r) => ({
      y: r.y,
      cells: [normalizeCell(r.items.map((it) => it.str).join(' '))],
    }));
  }

  const sortedCenters = [...rightCenters].sort((a, b) => a - b);
  const firstRight = sortedCenters[0];
  const centerGaps = sortedCenters.slice(1).map((c, i) => c - sortedCenters[i]);
  const avgGap = centerGaps.length ? centerGaps.reduce((a, b) => a + b, 0) / centerGaps.length : 48;
  const rightAssignDist = Math.max(16, avgGap * 0.48);
  const leftBoundary = firstRight - Math.max(20, avgGap * 0.45);

  return rowBuckets.map((row) => {
    const right = Array.from({ length: sortedCenters.length }, () => '');
    const leftItems = [];

    for (const it of row.items) {
      const t = normalizeCell(it.str);
      if (!t) continue;

      const isMark = /^[xX]$/.test(t);
      const isMoney = /^S\/\s*\d/i.test(t);
      const shortValue = t.length <= 20 && it.w <= 60;
      const likelyRight = isMark || isMoney || shortValue;

      if (likelyRight) {
        const { idx, dist } = nearestCenter(it.xmid, sortedCenters);
        if (dist <= rightAssignDist) {
          right[idx] = right[idx] ? `${right[idx]} ${t}` : t;
          continue;
        }
      }

      if (it.xmid < leftBoundary) leftItems.push(it);
      else {
        // Texto en zona intermedia: también lo tratamos como izquierdo para no perder info.
        leftItems.push(it);
      }
    }

    const left = mergeLeftSegmentsToN(leftItems.sort((a, b) => a.x - b.x), LEFT_COLS);
    return { y: row.y, cells: [...left, ...right] };
  });
}

function splitRowBlocksByVerticalGaps(rows) {
  if (!rows.length) return [];
  const ys = rows.map((r) => r.y);
  const gaps = [];
  for (let i = 0; i < ys.length - 1; i++) gaps.push(ys[i] - ys[i + 1]);

  const baseline = median(gaps.filter((g) => g > 0 && g <= 15)) || median(gaps.filter((g) => g > 0)) || 8;
  const splitGap = Math.max(20, baseline * 2.8);

  const starts = [0];
  for (let i = 0; i < gaps.length; i++) {
    if (gaps[i] > splitGap) starts.push(i + 1);
  }

  const blocks = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : rows.length;
    blocks.push(rows.slice(from, to));
  }
  return blocks.filter((b) => b.length > 0);
}

function maxColsOf(matrix) {
  return matrix.reduce((n, r) => Math.max(n, r.length), 0);
}

function tableNameFromBlock(block, fallback) {
  if (!block.length) return fallback;
  const first = block[0].cells.slice(0, LEFT_COLS).map(normalizeCell).join(' ').trim();
  if (!first) return fallback;
  const compact = first.replace(/\s+/g, ' ').trim();
  if (compact.length > 48) return fallback;
  return compact;
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<{ ok: boolean, numpages: number, tables: Array<{id:number,nombre:string,filas:number,columnas:number,celdas:string[][]}> }>}
 */
async function extractPerfilPdfTablesFromBuffer(buffer) {
  const data = Buffer.isBuffer(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);

  const task = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  });

  const pdf = await task.promise;
  try {
    const numpages = pdf.numPages || 0;
    if (numpages < 1) return { ok: true, numpages: 0, tables: [] };

    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });

    const items = parseItems(textContent);
    if (!items.length) return { ok: true, numpages, tables: [] };

    const rowBuckets = bucketRows(items);
    const rightCenters = inferRightCenters(items);
    const gridRows = gridifyRows(rowBuckets, rightCenters);
    const blocks = splitRowBlocksByVerticalGaps(gridRows);

    const tables = blocks.map((b, i) => {
      const celdas = trimTrailingEmptyRows(b.map((r) => r.cells));
      return {
        id: i + 1,
        nombre: tableNameFromBlock(b, `Tabla ${i + 1}`),
        filas: celdas.length,
        columnas: maxColsOf(celdas),
        celdas,
      };
    });

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

module.exports = {
  extractPerfilPdfTablesFromBuffer,
};

/**
 * Extrae tablas de un PDF de perfil EMO sin Python (pdf.js / pdfjs-dist).
 *
 * - Se infieren 6 centros de columna agrupando las X de todo el PDF (misma columna ≈ misma X).
 * - Por fila: texto a la izquierda del primer centro → hasta 3 celdas; "X"/"x"/"S/ …"/palabras
 *   cortas de cabecera (OPERATIVO, etc.) se colocan en la columna más cercana.
 * - Sin bastantes muestras de X, se usa el método por huecos (CELL_GAP_MIN).
 *
 * Limitación: X solo como vector o celda fusionada puede no aparecer como texto en esa fila
 * (p. ej. varias filas bajo "Oftalmológica Completo"); no hay tokens que asignar.
 */

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

const ROW_Y_TOL = 4;
const MERGE_GAP = 2;
/** Respaldo si no hay suficientes marcas X para inferir rejilla (método por huecos). */
const CELL_GAP_MIN = Math.max(6, parseInt(process.env.PDF_PERFIL_CELL_GAP || '12', 10) || 12);

/** Margen respecto al primer centro de columna de marcas: a la izquierda = texto. */
const LEFT_OF_MARKS_MARGIN = 24;
/** Máx. distancia (PDF units) para asignar X / S/ / palabra corta a una columna de marcas. */
const MARK_ASSIGN_MAX_DIST = 34;
/** Agrupación 1D de posiciones X de marcas (puntos por columna). */
const MARK_CLUSTER_GAP = 15;

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

/**
 * Agrupa valores 1D en clusters cuando el salto entre vecinos ordenados > gap.
 * @param {number[]} values
 * @param {number} gap
 * @returns {number[]} un centro por cluster (media)
 */
function cluster1DMeans(values, gap) {
  const s = [...values].sort((a, b) => a - b);
  const clusters = [];
  for (const x of s) {
    const last = clusters[clusters.length - 1];
    if (!last || x - last[last.length - 1] > gap) {
      clusters.push([x]);
    } else {
      last.push(x);
    }
  }
  return clusters.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
}

/**
 * @param {number} x
 * @param {number[]} centers ordenados
 */
function nearestMarkIndex(x, centers) {
  let best = 0;
  let d = Infinity;
  for (let j = 0; j < centers.length; j++) {
    const dd = Math.abs(x - centers[j]);
    if (dd < d) {
      d = dd;
      best = j;
    }
  }
  return { idx: best, dist: d };
}

/**
 * Inferir centros de las columnas de marcas (típicamente 6) a partir de todos los tokens
 * que son solo "X" o "x" en el documento.
 * @param {Array<{ str: string, xmid: number }>} items
 * @returns {number[] | null} centros ordenados asc
 */
function inferMarkCenters(items) {
  const xs = items.filter((it) => /^[xX]$/.test(String(it.str).trim())).map((it) => it.xmid);
  if (xs.length < 8) {
    return null;
  }
  let centers = cluster1DMeans(xs, MARK_CLUSTER_GAP);
  centers.sort((a, b) => a - b);

  while (centers.length > 6) {
    let minI = 0;
    let minGap = Infinity;
    for (let i = 0; i < centers.length - 1; i++) {
      const g = centers[i + 1] - centers[i];
      if (g < minGap) {
        minGap = g;
        minI = i;
      }
    }
    const merged = (centers[minI] + centers[minI + 1]) / 2;
    centers = [...centers.slice(0, minI), merged, ...centers.slice(minI + 2)];
  }

  if (centers.length !== 6) {
    return null;
  }
  return centers;
}

/**
 * ¿Palabra corta de cabecera en zona de rejilla (OPERATIVO, ANUAL, etc.)?
 */
function isShortHeaderInMarkZone(s) {
  const t = String(s).trim();
  if (t.length === 0 || t.length > 22) return false;
  if (/\s/.test(t)) return false;
  return /^[A-Za-zÁÉÍÓÚÜáéíóúüñÑ0-9./-]+$/.test(t);
}

/**
 * Une segmentos de texto de la zona izquierda en hasta 3 celdas.
 * @param {Array<{ str: string, x: number, x2: number }>} items
 */
function mergeLeftIntoThreeCells(items) {
  if (!items.length) {
    return ['', '', ''];
  }
  items.sort((a, b) => a.x - b.x);
  const merged = [];
  let cur = { ...items[0] };
  for (let i = 1; i < items.length; i++) {
    const n = items[i];
    const gap = n.x - cur.x2;
    if (gap <= MERGE_GAP) {
      cur.str += String(n.str).startsWith(' ') ? n.str : ` ${n.str}`;
      cur.x2 = Math.max(cur.x2, n.x2);
    } else {
      merged.push(cur);
      cur = { ...n };
    }
  }
  merged.push(cur);
  const parts = merged.map((m) => normalizeCell(m.str));
  if (parts.length <= 3) {
    while (parts.length < 3) {
      parts.push('');
    }
    return parts;
  }
  return [parts[0], parts.slice(1, -1).join(' '), parts[parts.length - 1]];
}

/**
 * Construye una fila de 9 celdas: 3 texto + 6 marcas/precio/cabecera corta en rejilla.
 */
function buildRowNineCells(rowItems, markCenters) {
  const leftBound = markCenters[0] - LEFT_OF_MARKS_MARGIN;
  const marks = Array(6).fill('');
  const leftSegs = [];
  const shortHeaderCandidates = [];

  const sorted = [...rowItems].sort((a, b) => a.x - b.x);

  for (const it of sorted) {
    const s = String(it.str).trim();
    if (!s) continue;

    if (/^[xX]$/.test(s)) {
      const { idx, dist } = nearestMarkIndex(it.xmid, markCenters);
      if (dist <= MARK_ASSIGN_MAX_DIST) {
        const prev = marks[idx];
        marks[idx] = prev ? `${prev} ${s}` : s;
      }
      continue;
    }

    if (/^S\//.test(s)) {
      const { idx, dist } = nearestMarkIndex(it.xmid, markCenters);
      if (dist <= MARK_ASSIGN_MAX_DIST + 6) {
        const prev = marks[idx];
        marks[idx] = prev ? `${prev} ${s}` : s;
      }
      continue;
    }

    if (it.xmid < leftBound) {
      leftSegs.push(it);
      continue;
    }

    if (isShortHeaderInMarkZone(s)) {
      shortHeaderCandidates.push(it);
      continue;
    }

    leftSegs.push(it);
  }

  // Regla general: solo tratamos "palabras cortas en zona de rejilla" como cabecera
  // si hay contexto de columnas (>=2 candidatas) o ya hay marcas/precios en la misma fila.
  const hasMarkContext = marks.some((m) => normalizeCell(m).length > 0) || shortHeaderCandidates.length >= 2;
  if (hasMarkContext) {
    for (const it of shortHeaderCandidates) {
      const s = String(it.str).trim();
      const { idx, dist } = nearestMarkIndex(it.xmid, markCenters);
      if (dist <= MARK_ASSIGN_MAX_DIST + 10) {
        const prev = marks[idx];
        marks[idx] = prev ? `${prev} ${s}` : s;
      } else {
        leftSegs.push(it);
      }
    }
  } else {
    leftSegs.push(...shortHeaderCandidates);
  }

  const left = mergeLeftIntoThreeCells(leftSegs);
  return [...left, ...marks];
}

/**
 * Método antiguo: solo huecos horizontales (respaldo).
 */
function textContentToMatrixGapFallback(textContent) {
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
    return { str: String(it.str), x, y, x2: x + w, w, xmid: x + w / 2 };
  });

  const markCenters = inferMarkCenters(items);
  if (!markCenters) {
    return textContentToMatrixGapFallback(textContent);
  }

  items.sort((a, b) => {
    if (Math.abs(a.y - b.y) > ROW_Y_TOL) return b.y - a.y;
    return a.x - b.x;
  });

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

  const matrix = [];
  for (const bucket of rowBuckets) {
    const row = buildRowNineCells(bucket, markCenters);
    if (row.some((c) => normalizeCell(c).length > 0)) {
      matrix.push(row);
    }
  }

  return matrix;
}

function nonEmptyCount(arr) {
  return arr.reduce((n, c) => n + (normalizeCell(c) ? 1 : 0), 0);
}

function isUpperLikeTitle(text) {
  const t = normalizeCell(text);
  if (!t) return false;
  const letters = (t.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length;
  if (!letters) return false;
  const upper = (t.match(/[A-ZÁÉÍÓÚÜÑ]/g) || []).length;
  return upper / letters >= 0.65;
}

function maybeSectionStart(matrix, i) {
  const row = matrix[i] || [];
  const next = matrix[i + 1] || [];
  const leftText = normalizeCell(row.slice(0, 3).join(' '));
  const marksNow = nonEmptyCount(row.slice(3));
  const marksNext = nonEmptyCount(next.slice(3));
  if (!leftText || marksNow > 1) return false;
  if (!isUpperLikeTitle(leftText) || leftText.length > 50) return false;
  return marksNext >= 4;
}

function splitMatrixIntoTables(matrix) {
  const starts = [0];
  for (let i = 1; i < matrix.length - 1; i++) {
    if (maybeSectionStart(matrix, i)) starts.push(i);
  }
  const sortedStarts = [...new Set(starts)].sort((a, b) => a - b);
  const tables = [];
  for (let k = 0; k < sortedStarts.length; k++) {
    const from = sortedStarts[k];
    const to = k + 1 < sortedStarts.length ? sortedStarts[k + 1] : matrix.length;
    const celdas = trimTrailingEmptyRows(matrix.slice(from, to));
    if (!celdas.length) continue;
    const title = normalizeCell(celdas[0].slice(0, 3).join(' '));
    tables.push({
      id: tables.length + 1,
      nombre: k === 0 ? 'Tabla 1' : title || `Tabla ${k + 1}`,
      filas: celdas.length,
      columnas: maxColsOf(celdas),
      celdas,
    });
  }
  if (!tables.length) {
    return [
      {
        id: 1,
        nombre: 'Tabla 1',
        filas: matrix.length,
        columnas: maxColsOf(matrix),
        celdas: matrix,
      },
    ];
  }
  return tables;
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<{ ok: boolean, numpages: number, tables: object[], error?: string }>}
 */
async function extractPerfilPdfTablesFromBuffer(buffer) {
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

    const tables = splitMatrixIntoTables(matrix);

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

module.exports = {
  extractPerfilPdfTablesFromBuffer,
  textContentToMatrix,
};
