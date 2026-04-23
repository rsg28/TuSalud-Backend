const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

/**
 * pdfjs-dist ≥4 es ESM (.mjs). Cargar con `import(fileURL)` evita resoluciones raras de `import('pkg/...')`
 * y falla con mensaje claro si en EC2 no se ejecutó `npm install` en TuSalud-Backend o quedó pdfjs 3.x.
 * (CVE-2024-4367 corregido en ≥4.2.67.)
 */
let pdfjsLibPromise;
function getPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      let pkgJson;
      try {
        pkgJson = require.resolve('pdfjs-dist/package.json');
      } catch {
        throw new Error(
          'pdfjs-dist no instalado en el backend. En la EC2: cd TuSalud-Backend && npm install && reinicie Node.'
        );
      }
      const root = path.dirname(pkgJson);
      const legacyPdf = path.join(root, 'legacy', 'build', 'pdf.mjs');
      const legacyWorker = path.join(root, 'legacy', 'build', 'pdf.worker.mjs');
      if (!fs.existsSync(legacyPdf)) {
        const legacyJs = path.join(root, 'legacy', 'build', 'pdf.js');
        const hint = fs.existsSync(legacyJs)
          ? 'Hay pdf.js 3.x (legacy .js); actualice package.json a pdfjs-dist ^4.4.x y npm install.'
          : `No existe ${legacyPdf}. Ejecute npm install en TuSalud-Backend y despliegue node_modules o el lockfile.`;
        throw new Error(`pdfjs-dist incompleto en ${root}. ${hint}`);
      }
      if (!fs.existsSync(legacyWorker)) {
        throw new Error(`pdfjs-dist incompleto: falta ${legacyWorker}`);
      }
      const pdfjsLib = await import(pathToFileURL(legacyPdf).href);
      pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(legacyWorker).href;
      return pdfjsLib;
    })();
  }
  return pdfjsLibPromise;
}

const ROW_Y_TOL = 4;
const INLINE_MERGE_GAP = 2;
const LEFT_COLS = 3;
const RIGHT_CENTER_CLUSTER_GAP = 15;
const MIN_RIGHT_CLUSTER_HITS = 3;
const EDGE_CLUSTER_GAP = 1.8;
const EDGE_MIN_HITS_X = 4;
const EDGE_MIN_HITS_Y = 3;

function normalizeCell(s) {
  return String(s || '').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
}

function foldForCompare(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function isExamenesGeneralesLabel(text) {
  const f = foldForCompare(text);
  return f === 'EXAMENES GENERALES' || f.startsWith('EXAMENES GENERALES ');
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

function removeCompletelyEmptyRows(matrix) {
  return matrix.filter((row) => row.some((c) => normalizeCell(c)));
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
      const h = typeof it.height === 'number' && it.height > 0 ? it.height : Math.max(5, Math.abs(m[3] || 0));
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

/**
 * Construye jerarquía izquierda (árbol) por continuidad vertical:
 * si una celda en col i queda vacía, hereda el nodo activo superior de col i
 * (rowspan implícito). Útil para categorías/subcategorías en tablas con celdas fusionadas.
 */
function buildLeftHierarchy(tableCells, leftCols = LEFT_COLS) {
  const nodes = [];
  const activeByCol = Array.from({ length: leftCols }, () => null);

  for (let r = 0; r < tableCells.length; r++) {
    const row = tableCells[r];
    for (let c = 0; c < leftCols; c++) {
      const val = normalizeCell(row[c]);
      if (!val) {
        const active = activeByCol[c];
        if (active) active.endRow = r;
        continue;
      }

      const prevActive = activeByCol[c];
      if (prevActive && prevActive.label === val) {
        prevActive.endRow = r;
      } else {
        // cerrar nodos más profundos cuando aparece un nuevo nodo en este nivel
        for (let k = c; k < leftCols; k++) {
          activeByCol[k] = null;
        }
        const parent = c > 0 ? activeByCol[c - 1] : null;
        const node = {
          id: nodes.length + 1,
          level: c,
          column: c,
          label: val,
          startRow: r,
          endRow: r,
          parentId: parent ? parent.id : null,
        };
        nodes.push(node);
        activeByCol[c] = node;
      }
    }
  }

  return nodes;
}

function rightMarksVector(row, leftCols = LEFT_COLS) {
  return row.slice(leftCols).map((v) => normalizeCell(v));
}

function hasAnyRightMark(row, leftCols = LEFT_COLS) {
  return rightMarksVector(row, leftCols).some((v) => v.length > 0);
}

function rowHasSelectionData(row, leftCols = LEFT_COLS) {
  const right = row.slice(leftCols).map((v) => normalizeCell(v));
  return right.some((v) => /^x$/i.test(v) || /^s\/\s*\d/i.test(v));
}

function mergeMarksVectors(vectors) {
  if (!vectors.length) return [];
  const cols = vectors[0].length;
  const out = Array.from({ length: cols }, () => '');
  for (const vec of vectors) {
    for (let i = 0; i < cols; i++) {
      const v = normalizeCell(vec[i]);
      if (!v) continue;
      if (!out[i]) out[i] = v;
      else if (!out[i].includes(v)) out[i] = `${out[i]} ${v}`;
    }
  }
  return out;
}

/**
 * Ajustes genéricos para subfilas en celdas fusionadas:
 * - si en un bloque de subítems numerados una fila tiene X y otras no, reparte las X a todas.
 * - si una fila trae "Subcategoria 3) ..." separa y propaga "Subcategoria" al resto de subítems.
 */
function normalizeMergedSubrows(tableCells, leftCols = LEFT_COLS) {
  const out = tableCells.map((r) => r.slice());
  if (!out.length) return out;
  const subgroupCol = Math.max(0, leftCols - 2);

  const isNumbered = (s) => /^\d\)\s/.test(normalizeCell(s));
  const splitPrefixNumbered = (s) => {
    const text = normalizeCell(s);
    const m = text.match(/^(.*?)(\d\)\s.*)$/);
    if (!m) return { prefix: '', numbered: text };
    const prefix = normalizeCell(m[1]);
    const numbered = normalizeCell(m[2]);
    return { prefix, numbered };
  };

  let i = 0;
  while (i < out.length) {
    const baseKey = normalizeCell(out[i][1]);
    let j = i;
    while (j + 1 < out.length && normalizeCell(out[j + 1][1]) === baseKey) j++;

    // bloque [i..j] con misma categoría principal
    const numberedRows = [];
    for (let r = i; r <= j; r++) {
      if (isNumbered(out[r][2])) numberedRows.push(r);
      else {
        const { prefix, numbered } = splitPrefixNumbered(out[r][2]);
        if (numbered && isNumbered(numbered)) {
          out[r][2] = numbered;
          if (prefix) {
            const cur = normalizeCell(out[r][subgroupCol]);
            if (!cur) out[r][subgroupCol] = prefix;
            else if (!cur.includes(prefix)) out[r][subgroupCol] = `${cur} ${prefix}`;
          }
          numberedRows.push(r);
        }
      }
    }

    if (numberedRows.length >= 2) {
      // 1) Propagar subcategoría (prefijo) entre subítems numerados
      let subgroup = '';
      for (const r of numberedRows) {
        const leftVal = normalizeCell(out[r][subgroupCol]);
        if (leftVal) {
          subgroup = leftVal;
          break;
        }
      }
      if (subgroup) {
        for (const r of numberedRows) {
          if (!normalizeCell(out[r][subgroupCol])) out[r][subgroupCol] = subgroup;
        }
      }

      // 2) Repartir marcas X/valores de celdas fusionadas a todas las subfilas numeradas
      const vecs = numberedRows
        .map((r) => rightMarksVector(out[r], leftCols))
        .filter((v) => v.some((x) => normalizeCell(x)));
      if (vecs.length) {
        const union = mergeMarksVectors(vecs);
        for (const r of numberedRows) {
          const has = hasAnyRightMark(out[r], leftCols);
          if (!has) {
            for (let c = 0; c < union.length; c++) {
              out[r][leftCols + c] = union[c];
            }
          }
        }
      }
    }

    i = j + 1;
  }

  return out;
}

function collapseStandaloneLargeRows(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const groupCol = Math.max(0, leftCols - 2);
  const detailCol = Math.max(0, leftCols - 1);
  const toDelete = new Set();

  for (let r = 0; r < out.length - 2; r++) {
    const row = out[r];
    const group = normalizeCell(row[groupCol]);
    const detail = normalizeCell(row[detailCol]);
    if (!group || detail) continue;
    if (!hasAnyRightMark(row, leftCols)) continue;

    const children = [];
    for (let k = r + 1; k < out.length; k++) {
      const rk = out[k];
      const gk = normalizeCell(rk[groupCol]);
      const dk = normalizeCell(rk[detailCol]);
      if (!dk) break;
      if (gk && gk !== group) break;
      children.push(k);
      if (children.length >= 8) break;
    }

    if (children.length < 2) continue;

    // Reparte solo la etiqueta de bloque; las marcas se respetan por fila hija
    // para no sobre-expandir X fuera del borde real de cada celda.
    for (const k of children) {
      const ck = out[k];
      if (!normalizeCell(ck[groupCol])) ck[groupCol] = group;
    }
    toDelete.add(r);
  }

  return out.filter((_, idx) => !toDelete.has(idx));
}

function propagateSectionHeaders(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const sectionCol = Math.max(0, leftCols - 2);
  const itemCol = Math.max(0, leftCols - 1);

  /**
   * Si en las filas con marcas a la derecha, la columna supuesta de "items" contiene en
   * su mayoría valores tipo marca (x / NO APLICA / S/.<n> / vacío / números cortos), entonces
   * esa columna no es una columna de ítems sino la primera columna de datos: la columna real
   * de ítems es `sectionCol`. En ese caso desactivamos la propagación, que está pensada para
   * tablas con patrón (sección, ítem, marcas...).
   */
  const isMarkLike = (text) => {
    const t = normalizeCell(text);
    if (!t) return true;
    if (/^x$/i.test(t)) return true;
    if (/^no\s*aplica$/i.test(t)) return true;
    if (/^s\/\s*\d/i.test(t)) return true;
    if (/^[0-9][0-9.,\s/%-]*$/.test(t)) return true;
    return false;
  };
  let markRows = 0;
  let markInItemCol = 0;
  for (const row of out) {
    if (!hasAnyRightMark(row, leftCols)) continue;
    markRows += 1;
    if (isMarkLike(row[itemCol])) markInItemCol += 1;
  }
  if (markRows >= 3 && markInItemCol / markRows >= 0.6) {
    return out;
  }

  let activeSection = '';
  const isSectionLabel = (text) => {
    const t = normalizeCell(text);
    if (!t || t.length < 6) return false;
    const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
    if (!letters) return false;
    const upper = letters.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length;
    return upper / letters.length >= 0.6;
  };

  for (let r = 0; r < out.length; r++) {
    const row = out[r];
    const sec = normalizeCell(row[sectionCol]);
    const item = normalizeCell(row[itemCol]);
    const hasRight = hasAnyRightMark(row, leftCols);

    if (sec && item && hasRight && isSectionLabel(sec)) {
      if (isExamenesGeneralesLabel(sec)) {
        activeSection = '';
        row[sectionCol] = '';
        continue;
      }
      activeSection = sec;
      continue;
    }

    if (!activeSection) continue;
    if (!hasRight) {
      activeSection = '';
      continue;
    }

    if (sec && !item) {
      row[itemCol] = sec;
      if (!isExamenesGeneralesLabel(activeSection)) row[sectionCol] = activeSection;
      else row[sectionCol] = '';
      continue;
    }

    if (!sec && item) {
      if (isExamenesGeneralesLabel(activeSection)) row[sectionCol] = '';
      else row[sectionCol] = activeSection;
    }

    if (item && /^precio\s+sin\s+igv$/i.test(item)) {
      if (!isExamenesGeneralesLabel(activeSection)) row[sectionCol] = activeSection;
    }
  }

  return out;
}

function alignLeftColumnsByStructure(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const sectionCol = Math.max(0, leftCols - 2);
  const detailCol = Math.max(0, leftCols - 1);

  // Detectar columna estructural de detalle por filas con patrón de datos.
  const score = Array.from({ length: leftCols }, () => 0);
  for (const row of out) {
    if (!hasAnyRightMark(row, leftCols)) continue;
    for (let c = 0; c < leftCols; c++) {
      if (normalizeCell(row[c])) score[c] += 1;
    }
  }
  let structuralDetail = detailCol;
  for (let c = 0; c < leftCols; c++) {
    if (score[c] > score[structuralDetail]) structuralDetail = c;
  }

  for (let r = 1; r < out.length - 1; r++) {
    const row = out[r];
    if (!hasAnyRightMark(row, leftCols)) continue;
    const sec = normalizeCell(row[sectionCol]);
    const det = normalizeCell(row[structuralDetail]);

    // Caso típico: el examen cayó una columna a la izquierda (ej. "Anexo 16 A").
    if (sec && !det && sectionCol !== structuralDetail) {
      const prevDet = normalizeCell(out[r - 1][structuralDetail]);
      const nextDet = normalizeCell(out[r + 1][structuralDetail]);
      if (prevDet || nextDet) {
        row[structuralDetail] = sec;
        row[sectionCol] = '';
      }
    }
  }
  return out;
}

/**
 * La agrupación por filas debe salir de las celdas delimitadas por bordes, no de texto fijo.
 * forwardFillLeftColumns ya cubre rowspan vertical cuando la celda viene vacía en el PDF.
 */
function fillGroupByVerticalContinuity(tableCells, leftCols = LEFT_COLS) {
  return tableCells.map((r) => r.slice());
}

/**
 * Etiqueta lateral "EXÁMENES GENERALES": quitar de todas las celdas (incl. restos del PDF).
 */
function stripExamenesGeneralesDecoration(tableCells) {
  const re = /EX[ÁA]MENES\s+GENERALES/gi;
  return tableCells.map((row) =>
    row.map((cell) => {
      let s = normalizeCell(cell);
      if (!s) return '';
      for (let i = 0; i < 6; i++) {
        const f = foldForCompare(s);
        if (f === 'EXAMENES GENERALES') return '';
        if (!f.includes('EXAMENES GENERALES')) return s;
        const next = normalizeCell(s.replace(re, ' ').replace(/\s+/g, ' ').trim());
        if (next === s) return s;
        s = next;
      }
      return normalizeCell(s);
    })
  );
}

/**
 * Rebalancea filas que quedaron corridas 1 columna a la derecha en el bloque izquierdo
 * (caso típico tras limpiar etiquetas laterales de celdas fusionadas).
 * Regla: usar columna dominante de filas de datos + continuidad vertical vecina.
 */
function rebalanceSingleLeftCellToDominantColumn(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const freq = Array.from({ length: leftCols }, () => 0);
  const leftNonEmptyIdx = (row) => {
    const idx = [];
    for (let c = 0; c < leftCols; c++) if (normalizeCell(row[c])) idx.push(c);
    return idx;
  };

  for (const row of out) {
    if (!hasAnyRightMark(row, leftCols)) continue;
    const idx = leftNonEmptyIdx(row);
    if (idx.length === 1) freq[idx[0]] += 1;
  }

  let dominant = 0;
  for (let c = 1; c < freq.length; c++) {
    if (freq[c] > freq[dominant]) dominant = c;
  }

  for (let r = 1; r < out.length - 1; r++) {
    const row = out[r];
    if (!hasAnyRightMark(row, leftCols)) continue;
    const idx = leftNonEmptyIdx(row);
    if (idx.length !== 1) continue;
    const src = idx[0];
    if (src === dominant) continue;
    if (Math.abs(src - dominant) !== 1) continue;
    if (normalizeCell(row[dominant])) continue;

    const prev = out[r - 1];
    const next = out[r + 1];
    const prevHasDom = normalizeCell(prev[dominant]) && hasAnyRightMark(prev, leftCols);
    const nextHasDom = normalizeCell(next[dominant]) && hasAnyRightMark(next, leftCols);
    if (!prevHasDom && !nextHasDom) continue;

    row[dominant] = row[src];
    row[src] = '';
  }

  return out;
}

/**
 * Fila de precios: en el PDF la etiqueta va en una celda; texto sobrante a la izquierda
 * de "PRECIO" (misma fila) no aporta y suele ser arrastre de la fila anterior.
 */
function clearLeftCellsBeforePrecioInRow(tableCells) {
  const cellHasPrecio = (cell) => /\bprecio\b/i.test(normalizeCell(String(cell || '')));
  return tableCells.map((row) => {
    const colIdx = row.findIndex((cell) => cellHasPrecio(cell));
    if (colIdx <= 0) return row.slice();
    const out = row.slice();
    for (let c = 0; c < colIdx; c++) out[c] = '';
    return out;
  });
}

function countNonEmpty(arr) {
  return arr.reduce((n, c) => n + (normalizeCell(c) ? 1 : 0), 0);
}

/**
 * Corrige drift horizontal en el bloque izquierdo (cols 0..LEFT_COLS-1):
 * algunas filas llegan una columna más a la izquierda por ruido de bbox.
 * Usa (a) columna dominante y (b) celda de arriba como guía.
 */
function stabilizeLeftColumns(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const leftIndex = (row) => {
    const idx = [];
    for (let i = 0; i < leftCols; i++) if (normalizeCell(row[i])) idx.push(i);
    return idx;
  };

  // Columna descriptiva dominante en filas de datos (con marcas a la derecha).
  const freq = Array.from({ length: leftCols }, () => 0);
  for (const row of out) {
    if (!hasAnyRightMark(row, leftCols)) continue;
    const idx = leftIndex(row);
    if (idx.length === 1) freq[idx[0]] += 1;
  }
  let dominant = 0;
  for (let i = 1; i < freq.length; i++) {
    if (freq[i] > freq[dominant]) dominant = i;
  }

  // Corrección conservadora: mover solo +/-1 columna y con evidencia vertical.
  for (let r = 1; r < out.length - 1; r++) {
    const row = out[r];
    if (!hasAnyRightMark(row, leftCols)) continue;
    const idx = leftIndex(row);
    if (idx.length !== 1) continue;
    const src = idx[0];
    if (src === dominant) continue;
    if (Math.abs(src - dominant) !== 1) continue;
    if (normalizeCell(row[dominant])) continue;

    const prev = out[r - 1];
    const next = out[r + 1];
    const prevDom = normalizeCell(prev[dominant]) && hasAnyRightMark(prev, leftCols);
    const nextDom = normalizeCell(next[dominant]) && hasAnyRightMark(next, leftCols);
    const prevSrc = normalizeCell(prev[src]) && hasAnyRightMark(prev, leftCols);
    const nextSrc = normalizeCell(next[src]) && hasAnyRightMark(next, leftCols);

    // Solo ajustar cuando los vecinos de arriba/abajo respaldan la columna dominante.
    if ((prevDom || nextDom) && !prevSrc && !nextSrc) {
      row[dominant] = row[src];
      row[src] = '';
    }
  }
  return out;
}

/**
 * Expande celdas fusionadas verticales (rowspan implícito) en columnas izquierdas:
 * si una celda izquierda viene vacía pero la fila tiene subcategoría/datos, se rellena
 * con el último valor visto en esa misma columna.
 */
function forwardFillLeftColumns(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const out = tableCells.map((r) => r.slice());
  const carry = Array.from({ length: leftCols }, () => '');

  for (let r = 0; r < out.length; r++) {
    const row = out[r];
    for (let c = 0; c < leftCols; c++) {
      const cur = normalizeCell(row[c]);
      if (cur) {
        carry[c] = cur;
        // Cuando aparece un valor en un nivel, los niveles más profundos se reinician.
        for (let k = c + 1; k < leftCols; k++) carry[k] = '';
        continue;
      }

      const hasMeaningfulContext = row
        .slice(c + 1)
        .some((v) => normalizeCell(v).length > 0);

      if (hasMeaningfulContext && carry[c]) {
        row[c] = carry[c];
      }
    }
  }
  return out;
}

function expandMergedHeadersAndSpans(tableCells, leftCols = LEFT_COLS) {
  if (!tableCells.length) return tableCells;
  const colCount = Math.max(...tableCells.map((r) => r.length));
  const out = tableCells.map((r) => {
    const row = r.slice();
    while (row.length < colCount) row.push('');
    return row;
  });

  const firstDataRow = out.findIndex((row) => rowHasSelectionData(row, leftCols));
  const headerEnd = firstDataRow > 0 ? firstDataRow : 0;
  if (headerEnd <= 0) return out;

  // 1) Rowspan en cabeceras: solo en bloque descriptivo izquierdo para no contaminar columnas de grupos.
  const rowspanCols = Math.min(colCount, Math.max(3, leftCols));
  for (let c = 0; c < rowspanCols; c++) {
    let carry = '';
    for (let r = 0; r < headerEnd; r++) {
      const cur = normalizeCell(out[r][c]);
      if (cur) {
        carry = cur;
        continue;
      }
      if (carry) out[r][c] = carry;
    }
  }

  // 2) Colspan en cabeceras: repetir a la derecha hasta próximo valor explícito.
  for (let r = 0; r < headerEnd; r++) {
    let c = 0;
    while (c < colCount) {
      const val = normalizeCell(out[r][c]);
      if (!val) {
        c += 1;
        continue;
      }
      let next = c + 1;
      while (next < colCount && !normalizeCell(out[r][next])) next += 1;
      for (let k = c + 1; k < next; k++) out[r][k] = val;
      c = next;
    }
  }

  // 3) Si una cabecera tiene un solo bloque grande, expandir al rango estructural
  // detectado por la fila más completa (normalmente GRUPO OCUPACIONAL).
  const densestRow = out.reduce(
    (best, row, idx) => {
      const score = countNonEmpty(row);
      return score > best.score ? { idx, score } : best;
    },
    { idx: 0, score: -1 }
  ).idx;
  const structureCols = [];
  for (let c = 0; c < colCount; c++) {
    if (normalizeCell(out[densestRow][c])) structureCols.push(c);
  }
  if (structureCols.length >= 2) {
    const from = structureCols[0];
    const to = structureCols[structureCols.length - 1];
    for (let r = 0; r < headerEnd; r++) {
      const filled = [];
      for (let c = 0; c < colCount; c++) if (normalizeCell(out[r][c])) filled.push(c);
      if (filled.length !== 1) continue;
      const only = filled[0];
      const val = normalizeCell(out[r][only]);
      if (!val) continue;
      if (only < from || only > to) continue;
      for (let c = from; c <= to; c++) {
        if (!normalizeCell(out[r][c])) out[r][c] = val;
      }
    }
  }

  return out;
}

function clusterEdges(values, gap = EDGE_CLUSTER_GAP) {
  if (!values.length) return [];
  const s = [...values].sort((a, b) => a - b);
  const groups = [];
  for (const v of s) {
    const g = groups[groups.length - 1];
    if (!g || v - g[g.length - 1] > gap) groups.push([v]);
    else g.push(v);
  }
  return groups.map((g) => ({
    value: g.reduce((a, b) => a + b, 0) / g.length,
    hits: g.length,
  }));
}

/**
 * Borde inferior “útil” del texto acumulado (evita usar una línea de pie muy baja como ancla).
 * Usa la fila agrupada más baja en Y con varios fragmentos de texto.
 */
function approximateContentBottomY(items) {
  if (!items.length) return 0;
  const rows = bucketRows(items);
  if (!rows.length) return Math.min(...items.map((i) => i.y));
  const asc = [...rows].sort((a, b) => a.y - b.y);
  for (const row of asc) {
    const n = row.items.filter((it) => normalizeCell(it.str).length >= 2).length;
    if (n >= 2) return row.y;
  }
  return asc[0].y;
}

/** Borde superior útil de la página siguiente (cabecera / primera banda con texto). */
function approximateContentTopY(items) {
  if (!items.length) return 0;
  const rows = bucketRows(items);
  if (!rows.length) return Math.max(...items.map((i) => i.y));
  return Math.max(...rows.map((r) => r.y));
}

function computeInterPageStackGap(items) {
  const rows = bucketRows(items);
  if (rows.length < 2) return 10;
  const ys = rows.map((r) => r.y).sort((a, b) => b - a);
  const gaps = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const g = ys[i] - ys[i + 1];
    if (g > 0 && g < 48) gaps.push(g);
  }
  const m = median(gaps);
  return m > 0 && m < 48 ? Math.min(16, Math.max(6, m * 0.85)) : 10;
}

function computeStackDeltaY(mergedItems, nextPageItems, gap) {
  if (!mergedItems.length || !nextPageItems.length) return 0;
  const bottomPrev = approximateContentBottomY(mergedItems);
  const topNext = approximateContentTopY(nextPageItems);
  return bottomPrev - topNext - gap;
}

/**
 * Extrae los bordes del stream del PDF como “rectángulos delgados”:
 *  - Cajas explícitas (`re`) → rectángulo tal cual.
 *  - Caminos con `moveTo`/`lineTo` → cada segmento horizontal / vertical se normaliza a un
 *    rectángulo fino (así `tryBuildGridFromRectangles` reconoce líneas de tabla aunque el PDF
 *    las dibuje como trazos y no como `re` + fill). Esto es clave para tablas cuyas columnas
 *    internas no se detectaban porque solo los cuadros exteriores eran rectángulos rellenos.
 */
async function extractRectanglesFromPage(page, pdfjsLib) {
  const OPS = pdfjsLib.OPS;
  const operatorList = await page.getOperatorList();
  const rects = [];
  const SEGMENT_AXIS_TOL = 0.8;
  const SEGMENT_MIN_LENGTH = 3;
  const SEGMENT_THICKNESS = 0.5;

  const pushRect = (x1, x2, y1, y2) => {
    rects.push({
      x1: Math.min(x1, x2),
      x2: Math.max(x1, x2),
      y1: Math.min(y1, y2),
      y2: Math.max(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1),
    });
  };

  const pushSegmentAsRect = (ax, ay, bx, by) => {
    const dx = Math.abs(bx - ax);
    const dy = Math.abs(by - ay);
    if (dx <= SEGMENT_AXIS_TOL && dy >= SEGMENT_MIN_LENGTH) {
      pushRect(ax - SEGMENT_THICKNESS, ax + SEGMENT_THICKNESS, ay, by);
      return;
    }
    if (dy <= SEGMENT_AXIS_TOL && dx >= SEGMENT_MIN_LENGTH) {
      pushRect(ax, bx, ay - SEGMENT_THICKNESS, ay + SEGMENT_THICKNESS);
    }
  };

  for (let i = 0; i < operatorList.fnArray.length; i++) {
    if (operatorList.fnArray[i] !== OPS.constructPath) continue;
    const args = operatorList.argsArray[i] || [];
    const ops = args[0];
    const coords = args[1] || [];
    if (!ops || !ops.length) continue;

    let ci = 0;
    let curX = 0;
    let curY = 0;
    let startX = 0;
    let startY = 0;
    for (const op of ops) {
      if (op === OPS.moveTo) {
        const x = coords[ci++];
        const y = coords[ci++];
        curX = x;
        curY = y;
        startX = x;
        startY = y;
      } else if (op === OPS.lineTo) {
        const x = coords[ci++];
        const y = coords[ci++];
        pushSegmentAsRect(curX, curY, x, y);
        curX = x;
        curY = y;
      } else if (op === OPS.curveTo) {
        ci += 6;
      } else if (op === OPS.curveTo2 || op === OPS.curveTo3) {
        ci += 4;
      } else if (op === OPS.rectangle) {
        const x = coords[ci++];
        const y = coords[ci++];
        const w = coords[ci++];
        const h = coords[ci++];
        pushRect(x, x + w, y, y + h);
        curX = x;
        curY = y;
        startX = x;
        startY = y;
      } else if (op === OPS.closePath) {
        if (curX !== startX || curY !== startY) {
          pushSegmentAsRect(curX, curY, startX, startY);
          curX = startX;
          curY = startY;
        }
      }
    }
  }
  return rects;
}

function tryBuildGridFromRectangles(rects) {
  if (!rects.length) return null;
  const xEdges = [];
  const yEdges = [];
  for (const r of rects) {
    // ignorar rectángulos minúsculos
    if (r.w < 8 && r.h < 8) continue;
    xEdges.push(r.x1, r.x2);
    yEdges.push(r.y1, r.y2);
  }
  // Bordes dibujados como rectángulos muy delgados (líneas horizontales/verticales)
  for (const r of rects) {
    if (r.w < 4 && r.h < 4) continue;
    const horiz = r.w >= 18 && r.h <= 7;
    const vert = r.h >= 18 && r.w <= 7;
    if (horiz || vert) {
      xEdges.push(r.x1, r.x2);
      yEdges.push(r.y1, r.y2);
    }
  }
  const xClusters = clusterEdges(xEdges).filter((c) => c.hits >= EDGE_MIN_HITS_X).sort((a, b) => a.value - b.value);
  const yClusters = clusterEdges(yEdges).filter((c) => c.hits >= EDGE_MIN_HITS_Y).sort((a, b) => b.value - a.value);
  if (xClusters.length < 4) return null;
  return {
    xLines: xClusters.map((c) => c.value),
    yLines: yClusters.map((c) => c.value),
  };
}


function assignRowBucketsToXGrid(rowBuckets, xLines) {
  const sortedX = [...xLines].sort((a, b) => a - b);
  return rowBuckets.map((row) => {
    const cells = Array.from({ length: Math.max(1, sortedX.length - 1) }, () => []);
    for (const it of row.items) {
      const t = normalizeCell(it.str);
      if (!t) continue;
      let c = -1;
      for (let i = 0; i < sortedX.length - 1; i++) {
        if (it.xmid >= sortedX[i] && it.xmid < sortedX[i + 1]) {
          c = i;
          break;
        }
      }
      if (c < 0) continue;
      cells[c].push(it);
    }
    const mergedCells = cells.map((cellItems) => {
      if (!cellItems.length) return '';
      const sorted = [...cellItems].sort((a, b) => a.x - b.x);
      const merged = [];
      let cur = { ...sorted[0] };
      for (let i = 1; i < sorted.length; i++) {
        const nx = sorted[i];
        if (nx.x - cur.x2 <= INLINE_MERGE_GAP) {
          cur.str += String(nx.str).startsWith(' ') ? nx.str : ` ${nx.str}`;
          cur.x2 = Math.max(cur.x2, nx.x2);
        } else {
          merged.push(cur);
          cur = { ...nx };
        }
      }
      merged.push(cur);
      return normalizeCell(merged.map((m) => m.str).join(' '));
    });
    return { y: row.y, cells: mergedCells };
  });
}

/**
 * Fila = banda horizontal delimitada por yLines (bordes); columna = máximo solape en X con esa banda.
 * Si el baseline no cae en ninguna banda, se usa la fila con mayor solape vertical token–celda.
 */
function assignItemsToGridCells(items, xLines, yLines) {
  const sortedX = [...xLines].sort((a, b) => a - b);
  const sortedY = [...yLines].sort((a, b) => b - a);
  const nr = sortedY.length - 1;
  const rows = Array.from({ length: nr }, () => Array.from({ length: sortedX.length - 1 }, () => []));

  const rowByVerticalOverlap = (it) => {
    const tokenYTop = it.y;
    const tokenYBottom = it.y - Math.max(3, it.h || 0);
    let bestR = -1;
    let bestH = 0;
    for (let j = 0; j < nr; j++) {
      const yTop = sortedY[j];
      const yBottom = sortedY[j + 1];
      const interH = Math.max(0, Math.min(tokenYTop, yTop) - Math.max(tokenYBottom, yBottom));
      if (interH > bestH) {
        bestH = interH;
        bestR = j;
      }
    }
    return bestR;
  };

  for (const it of items) {
    const t = normalizeCell(it.str);
    if (!t) continue;

    let r = -1;
    for (let j = 0; j < sortedY.length - 1; j++) {
      if (it.y <= sortedY[j] && it.y > sortedY[j + 1]) {
        r = j;
        break;
      }
    }
    if (r < 0) r = rowByVerticalOverlap(it);
    if (r < 0) continue;

    let c = -1;
    let bestW = 0;
    for (let i = 0; i < sortedX.length - 1; i++) {
      const x1 = sortedX[i];
      const x2 = sortedX[i + 1];
      const interW = Math.max(0, Math.min(it.x2, x2) - Math.max(it.x, x1));
      if (interW > bestW) {
        bestW = interW;
        c = i;
      }
    }
    if (c < 0 || bestW <= 0) {
      for (let i = 0; i < sortedX.length - 1; i++) {
        if (it.xmid >= sortedX[i] && it.xmid < sortedX[i + 1]) {
          c = i;
          break;
        }
      }
    }
    if (c < 0) continue;
    rows[r][c].push(it);
  }

  return rows.map((row) =>
    row.map((cellItems) => {
      if (!cellItems.length) return '';
      const sorted = [...cellItems].sort((a, b) => a.x - b.x);
      const merged = [];
      let cur = { ...sorted[0] };
      for (let i = 1; i < sorted.length; i++) {
        const nx = sorted[i];
        if (nx.x - cur.x2 <= INLINE_MERGE_GAP) {
          cur.str += String(nx.str).startsWith(' ') ? nx.str : ` ${nx.str}`;
          cur.x2 = Math.max(cur.x2, nx.x2);
        } else {
          merged.push(cur);
          cur = { ...nx };
        }
      }
      merged.push(cur);
      return dedupeCellTokens(normalizeCell(merged.map((m) => m.str).join(' ')));
    })
  );
}

/**
 * Colapsa repeticiones de tokens o frases dentro de una celda. Totalmente genérico:
 *   "X X X"              -> "X"
 *   "NO APLICA NO APLICA"-> "NO APLICA"
 *   "foo bar foo bar"    -> "foo bar"
 * No depende de valores concretos; detecta cualquier frase (1..N tokens) repetida.
 */
function dedupeCellTokens(raw) {
  const s = normalizeCell(raw);
  if (!s) return '';
  if (s.length > 120) return s;
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return s;

  const condensed = [];
  for (const p of parts) {
    if (condensed.length && condensed[condensed.length - 1] === p) continue;
    condensed.push(p);
  }
  if (condensed.length === 1) return condensed[0];

  const n = condensed.length;
  for (let k = 1; k <= Math.floor(n / 2); k++) {
    if (n % k !== 0) continue;
    let allMatch = true;
    for (let j = k; j < n && allMatch; j += k) {
      for (let i = 0; i < k; i++) {
        if (condensed[j + i] !== condensed[i]) {
          allMatch = false;
          break;
        }
      }
    }
    if (allMatch) return condensed.slice(0, k).join(' ');
  }
  return condensed.join(' ');
}

/**
 * Decide si la fila `rowAt` dentro de un span vertical es en realidad una cabecera de grupo
 * (y debe excluirse del merge). Criterios genéricos basados únicamente en el patrón numérico
 * de la columna izquierda — no hay strings hardcodeados.
 */
function isGroupHeaderRow(matrix, rowAt, rowOther, labelCol = 0) {
  if (!matrix[rowAt] || !matrix[rowOther]) return false;
  const parse = (v) => {
    const s = normalizeCell(v);
    const m = s.match(/^\s*(\d+)(?:\.(\d+))?/);
    if (!m) return null;
    return { major: m[1], minor: m[2] || null, raw: s };
  };
  const top = parse(matrix[rowAt][labelCol]);
  if (!top) return false;

  const rStart = Math.min(rowAt, rowOther);
  const rEnd = Math.max(rowAt, rowOther);
  const subs = [];
  for (let r = rStart; r <= rEnd; r++) {
    if (r === rowAt) continue;
    const p = parse(matrix[r][labelCol]);
    if (p) subs.push(p);
  }
  if (subs.length === 0) return false;

  const allSubDecimal = subs.every((p) => p.major === top.major && p.minor !== null);
  if (allSubDecimal && !top.minor) return true;

  const allSubPlain = subs.every((p) => !p.minor);
  if (allSubPlain && !top.minor) {
    const firstSub = subs[0];
    if (firstSub.major === '1' && top.major !== '1') return true;
    if (Number(firstSub.major) <= Number(top.major) - 1) return false;
    if (Number(firstSub.major) < Number(top.major)) return true;
  }
  return false;
}

/**
 * Limpia celdas cuya posición geométrica (fila × columna de la rejilla) no está cubierta
 * por ningún rectángulo de celda del PDF. Sirve para descartar texto del membrete u otra
 * información que geométricamente cae fuera del contorno real de la tabla.
 * Adicionalmente, poda del tope/base filas cuya cobertura de columnas con rectángulos es baja
 * (cajas aisladas como badges de cotización, etc.), descartando también sus líneas de rejilla.
 * Es puramente geométrico — sin strings hardcodeados.
 *
 * Devuelve { matrix, yLines } alineados.
 */
/**
 * Recorta SOLO filas del extremo superior/inferior que estén claramente fuera de la tabla.
 *
 * Heurística geométrica (sin texto hardcodeado):
 *   - Para cada fila, contamos cuántos rectángulos del PDF se solapan con su banda Y.
 *   - Las filas del cuerpo de la tabla tienen muchos rectángulos (bordes, fondos, celdas).
 *   - Las filas de metadatos/encabezados de documento sueltos (títulos, "Razón Social",
 *     badges, fecha, etc.) tienen muy pocos rectángulos y pocas celdas con texto.
 *
 * La función solo recorta desde los extremos hacia adentro; nunca borra filas del medio.
 */
function clearCellsOutsideTableRects(matrix, xLines, yLines, rects, options = {}) {
  const minCellW = options.minCellWidth ?? 6;
  const minCellH = options.minCellHeight ?? 6;
  const sortedX = [...xLines].sort((a, b) => a - b);
  const sortedY = [...yLines].sort((a, b) => b - a);
  const nRows = matrix.length;
  const nCols = matrix[0] ? matrix[0].length : 0;
  if (!nRows || !nCols) return { matrix, yLines: sortedY };

  const totalWidth = sortedX[sortedX.length - 1] - sortedX[0];
  const totalHeight = sortedY[0] - sortedY[sortedY.length - 1];
  // Excluimos solo rectángulos degenerados o que cubran prácticamente todo el bloque
  // (marco exterior / fondo global), para no sobrecontar.
  const maxW = totalWidth * 0.98;
  const maxH = totalHeight * 0.9;
  const useful = rects.filter(
    (r) => r.w >= minCellW && r.h >= minCellH && r.w <= maxW && r.h <= maxH
  );
  if (!useful.length) return { matrix, yLines: sortedY };

  const rectsPerRow = new Array(nRows).fill(0);
  for (let j = 0; j < nRows; j++) {
    const yTop = sortedY[j];
    const yBot = sortedY[j + 1];
    let count = 0;
    for (const r of useful) {
      const rYTop = Math.max(r.y1, r.y2);
      const rYBot = Math.min(r.y1, r.y2);
      const yOver = Math.min(rYTop, yTop) - Math.max(rYBot, yBot);
      if (yOver > 0) count += 1;
    }
    rectsPerRow[j] = count;
  }

  // Mediana de rects por fila como referencia: las filas del cuerpo deberían alcanzarla;
  // las "de fuera" tendrán un orden de magnitud menos.
  const sortedCounts = [...rectsPerRow].sort((a, b) => a - b);
  const median = sortedCounts[Math.floor(sortedCounts.length / 2)] || 0;
  const lowThreshold = Math.max(1, Math.floor(median * 0.25));

  const textCount = matrix.map((row) => row.filter((v) => normalizeCell(v)).length);
  const isOutsideRow = (j) => rectsPerRow[j] <= lowThreshold && textCount[j] <= 2;

  let top = 0;
  while (top < nRows && isOutsideRow(top)) top += 1;
  let bot = nRows - 1;
  while (bot > top && isOutsideRow(bot)) bot -= 1;

  const trimmedMatrix = matrix.slice(top, bot + 1);
  const trimmedYLines = sortedY.slice(top, bot + 2);
  return { matrix: trimmedMatrix, yLines: trimmedYLines };
}

/**
 * Propaga el valor de una celda a todo el bloque que ocupa un rectángulo grande del PDF
 * (celda combinada vertical u horizontal). Si el rectángulo cubre varias filas/columnas de la
 * rejilla, la celda no vacía dentro de ese bloque se replica en las demás.
 * Es genérico: funciona para cualquier `rowspan` / `colspan` detectado por geometría.
 */
function expandValuesAcrossMergedRects(matrix, xLines, yLines, rects, options = {}) {
  if (!matrix || !matrix.length) return matrix;
  const minCellW = options.minCellWidth ?? 6;
  const minCellH = options.minCellHeight ?? 6;
  const maxSpanRows = options.maxSpanRows ?? 8;
  const sortedX = [...xLines].sort((a, b) => a - b);
  const sortedY = [...yLines].sort((a, b) => b - a);
  if (sortedX.length < 2 || sortedY.length < 2) return matrix;
  const gridCols = sortedX.length - 1;
  // Permitir cualquier colspan salvo los que abarcan casi toda la tabla (marco externo).
  // El filtro por tamaño de rectángulo ya descarta fondos/marcos; este tope complementario
  // evita propagar accidentalmente el borde más externo del bloque.
  const maxSpanCols = options.maxSpanCols ?? Math.max(3, Math.floor(gridCols * 0.85));

  const totalWidth = sortedX[sortedX.length - 1] - sortedX[0];
  const totalHeight = sortedY[0] - sortedY[sortedY.length - 1];
  const maxW = totalWidth * 0.85;
  const maxH = totalHeight * 0.6;

  /** Solo rectángulos del tamaño de una celda o un merge razonable. Descarta marcos/fondos. */
  const bigRects = rects.filter(
    (r) => r.w >= minCellW && r.h >= minCellH && r.w <= maxW && r.h <= maxH
  );
  const out = matrix.map((r) => r.slice());
  const nRows = out.length;
  const nCols = out[0] ? out[0].length : 0;

  for (const r of bigRects) {
    const rx1 = Math.min(r.x1, r.x2);
    const rx2 = Math.max(r.x1, r.x2);
    const ryTop = Math.max(r.y1, r.y2);
    const ryBot = Math.min(r.y1, r.y2);

    const COL_TOL = 1.0;
    let colFrom = -1;
    let colTo = -1;
    for (let i = 0; i < sortedX.length - 1 && i < nCols; i++) {
      const cx1 = sortedX[i];
      const cx2 = sortedX[i + 1];
      if (cx1 >= rx1 - COL_TOL && cx2 <= rx2 + COL_TOL) {
        if (colFrom < 0) colFrom = i;
        colTo = i;
      }
    }
    if (colFrom < 0) continue;

    const ROW_TOL = 1.5;
    let rowFrom = -1;
    let rowTo = -1;
    for (let j = 0; j < sortedY.length - 1 && j < nRows; j++) {
      const rTop = sortedY[j];
      const rBot = sortedY[j + 1];
      if (rTop <= ryTop + ROW_TOL && rBot >= ryBot - ROW_TOL) {
        if (rowFrom < 0) rowFrom = j;
        rowTo = j;
      }
    }
    if (rowFrom < 0) continue;

    let spanRows = rowTo - rowFrom + 1;
    let spanCols = colTo - colFrom + 1;
    if (spanRows < 2 && spanCols < 2) continue;
    if (spanRows > maxSpanRows || spanCols > maxSpanCols) continue;
    /**
     * Solo merges “puros”: vertical (rowspan, 1 columna) u horizontal (colspan, 1 fila).
     * Un rectángulo que cubre varias filas Y varias columnas suele ser el borde externo
     * de un bloque/grupo y no una celda combinada real; no se propaga.
     */
    const isRowspanCand = spanRows >= 2 && spanCols === 1;
    const isColspanCand = spanCols >= 2 && spanRows === 1;
    if (!isRowspanCand && !isColspanCand) continue;

    if (isRowspanCand && colFrom > 0) {
      while (rowFrom < rowTo && isGroupHeaderRow(out, rowFrom, rowTo, 0)) {
        rowFrom += 1;
      }
      spanRows = rowTo - rowFrom + 1;
      if (spanRows < 2) continue;
    }

    const values = [];
    for (let rr = rowFrom; rr <= rowTo; rr++) {
      for (let cc = colFrom; cc <= colTo; cc++) {
        const v = normalizeCell(out[rr] && out[rr][cc]);
        if (v && !values.includes(v)) values.push(v);
      }
    }
    if (values.length !== 1) continue;
    const filled = values[0];
    for (let rr = rowFrom; rr <= rowTo; rr++) {
      for (let cc = colFrom; cc <= colTo; cc++) {
        if (!out[rr]) continue;
        if (!normalizeCell(out[rr][cc])) out[rr][cc] = filled;
      }
    }
  }
  return out;
}

function splitGridRowsByYGaps(matrix, yLines) {
  const gaps = [];
  for (let i = 0; i < yLines.length - 2; i++) {
    // gap between row i and i+1 baselines
    const g1 = yLines[i] - yLines[i + 1];
    const g2 = yLines[i + 1] - yLines[i + 2];
    gaps.push(Math.abs(g1 - g2));
  }
  const rowHeights = [];
  for (let i = 0; i < yLines.length - 1; i++) rowHeights.push(yLines[i] - yLines[i + 1]);
  const baseline = median(rowHeights.filter((h) => h > 0 && h <= 20)) || median(rowHeights.filter((h) => h > 0)) || 8;
  const splitGap = Math.max(22, baseline * 2.6);

  const starts = [0];
  for (let i = 0; i < rowHeights.length - 1; i++) {
    if (rowHeights[i + 1] > splitGap) starts.push(i + 1);
  }

  const blocks = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : matrix.length;
    const chunk = trimTrailingEmptyRows(matrix.slice(from, to));
    if (chunk.length) blocks.push(chunk);
  }
  return blocks;
}

function groupBorderRowsByTextBlocks(matrixByBorders, yLines, textBlocks) {
  const rowMids = [];
  for (let i = 0; i < yLines.length - 1 && i < matrixByBorders.length; i++) {
    rowMids.push({ yMid: (yLines[i] + yLines[i + 1]) / 2, cells: matrixByBorders[i] });
  }

  const ranges = textBlocks.map((b) => {
    const ys = b.map((r) => r.y);
    const top = Math.max(...ys);
    const bottom = Math.min(...ys);
    return { top, bottom };
  });

  const MARGIN_Y = 10;
  return ranges.map((rg) => {
    const rows = rowMids
      .filter((r) => r.yMid <= rg.top + MARGIN_Y && r.yMid >= rg.bottom - MARGIN_Y)
      .map((r) => r.cells);
    return trimTrailingEmptyRows(rows);
  });
}

function rowEmptyCellRatio(row) {
  const n = Math.max(1, row.length);
  return row.filter((c) => !normalizeCell(c)).length / n;
}

/**
 * Dos tablas pegadas en la misma grilla X/Y: a veces hay filas casi vacías entre bloques.
 * Parte solo si salen ≥2 bloques con algo de cuerpo.
 */
function splitMatrixOnSparseSeparatorBands(matrix, minBlockRows = 3, sparseThreshold = 0.94) {
  if (!matrix || matrix.length < minBlockRows * 2 + 1) return null;
  const blocks = [];
  let buf = [];
  let sepStreak = 0;
  for (const row of matrix) {
    if (rowEmptyCellRatio(row) >= sparseThreshold) {
      sepStreak += 1;
      if (buf.length >= minBlockRows) {
        blocks.push(trimTrailingEmptyRows(buf));
        buf = [];
      }
      continue;
    }
    sepStreak = 0;
    buf.push(row);
  }
  if (buf.length) blocks.push(trimTrailingEmptyRows(buf));
  return blocks.length > 1 ? blocks : null;
}

/**
 * Bloques con menos de `minRows` filas se fusionan con el vecino adyacente más razonable:
 * si hay vecino previo, se le anexan; si no, se anteponen al siguiente.
 * Esto evita que una cabecera corta salga como "tabla" separada.
 */
function mergeAdjacentSmallBlocks(blocks, minRows = 2) {
  if (blocks.length <= 1) return blocks;
  const out = [];
  const queued = [];
  for (const b of blocks) {
    if (b.length >= minRows) {
      if (queued.length) {
        const merged = queued.reduce((acc, q) => acc.concat(q), []);
        out.push([...merged, ...b]);
        queued.length = 0;
      } else {
        out.push(b);
      }
      continue;
    }
    if (out.length) {
      out[out.length - 1] = [...out[out.length - 1], ...b];
    } else {
      queued.push(b);
    }
  }
  if (queued.length) {
    const merged = queued.reduce((acc, q) => acc.concat(q), []);
    if (out.length) out[0] = [...merged, ...out[0]];
    else if (merged.length) out.push(merged);
  }
  return out.length ? out : blocks;
}

/**
 * Dentro de una banda semántica ya delimitada por títulos (ANEXO/NOTA/etc.) no debe volver a
 * partirse la rejilla: el dueño real del corte es el título. `anchorMode` baja la agresividad.
 */
function chooseBorderTableBlocks(matrixByBorders, yLines, textBlocks, options = {}) {
  const anchorMode = !!options.anchorMode;
  const clean = (rows) => trimTrailingEmptyRows(removeCompletelyEmptyRows(rows));

  const byText = groupBorderRowsByTextBlocks(matrixByBorders, yLines, textBlocks).map(clean).filter((b) => b.length > 0);

  let byGap = [];
  try {
    byGap = splitGridRowsByYGaps(matrixByBorders, yLines).map(clean).filter((b) => b.length > 0);
  } catch {
    byGap = [];
  }

  const bySparse = splitMatrixOnSparseSeparatorBands(matrixByBorders);

  const substantial = (bs) => bs.filter((b) => b.length >= 4).length;

  if (anchorMode) {
    return [trimTrailingEmptyRows(removeCompletelyEmptyRows(matrixByBorders))].filter(
      (b) => b.length > 0
    );
  }

  let pick = byText;
  if (byGap.length > byText.length && byGap.length <= 22 && substantial(byGap) >= Math.max(1, substantial(byText) - 1)) {
    pick = byGap;
  }
  if (bySparse && bySparse.length > pick.length && bySparse.length <= 22) {
    pick = bySparse;
  }

  pick = mergeAdjacentSmallBlocks(pick, 4);
  return pick.length ? pick : [matrixByBorders];
}

const ANCHOR_Y_PAD = 10;
const ANCHOR_MIN_SEP = 36;
const ANCHOR_MIN_BAND_HEIGHT = 28;
const ANCHOR_SLICE_MIN_ITEMS = 4;

function textItemVerticalBBox(it) {
  const h = Math.max(6, Math.abs(it.h || 0));
  const yTop = Math.max(it.y, it.y + (it.h >= 0 ? h * 0.2 : -h * 0.2));
  const yBot = Math.min(it.y, it.y - h);
  return { yTop, yBot };
}

/**
 * Títulos de sección típicos del protocolo (fuera o encima de la rejilla).
 * Patrones genéricos, sin nombres de cliente.
 */
function isSemanticAnchorString(t) {
  const s = normalizeCell(t);
  if (!s || s.length > 160) return false;
  const f = foldForCompare(s);
  if (/^\s*ANEXO\s*0?\d+/i.test(s)) return true;
  if (/^\s*NOTA\s*\d+\s*:/i.test(s)) return true;
  if (/\bNOTA\s*\d+\s*:/i.test(s) && s.length <= 100) return true;
  if (/\bANEXO\s*0?\d+\b/i.test(s) && s.length <= 95) return true;
  if (/\bEX[ÁA]MENES\s+ESPECIALES\b/i.test(f)) return true;
  if (/\bPOR\s+OPERACIONES\b/i.test(f) && s.length <= 90) return true;
  if (/\bEX[ÁA]MEN\s+M[EÉ]DICO\s+ANUAL\b/i.test(f)) return true;
  if (/\bANUAL\s+O\s+PERI[OÓ]DICO\b/i.test(f) && s.length <= 95) return true;
  if (/\bEX[ÁA]MEN\s+M[EÉ]DICO\s+PREOCUPACIONAL\b/i.test(f)) return true;
  if (/\bPREOCUPACIONAL\s+O\s+INGRESO\b/i.test(f) && s.length <= 100) return true;
  if (/\bEX[ÁA]MEN\s+M[EÉ]DICO\s+POST\b/i.test(f)) return true;
  if (/\bPOST\s+OCUPACIONAL\b/i.test(f) && s.length <= 100) return true;
  if (/\bDE\s+RETIRO\b/i.test(f) && s.length <= 100) return true;
  if (/\bEX[ÁA]MENES\s+CONDICIONALES\b/i.test(f)) return true;
  if (/\bEX[ÁA]MEN\s+M[EÉ]DICO\s+PERI[OÓ]DICO\b/i.test(f)) return true;
  if (/\bCONTROL\s+(ANUAL|TRIMESTRAL)\b/i.test(f) && s.length <= 120) return true;
  if (/\bMANIPULADOR\s+DE\s+ALIMENTOS\b/i.test(f) && s.length <= 120) return true;
  return false;
}

function detectSemanticAnchors(items) {
  const out = [];
  for (const it of items) {
    if (!isSemanticAnchorString(it.str)) continue;
    const { yTop, yBot } = textItemVerticalBBox(it);
    out.push({
      yTop,
      yBot,
      text: normalizeCell(it.str).slice(0, 120),
    });
  }
  out.sort((a, b) => b.yTop - a.yTop);
  const deduped = [];
  for (const a of out) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.yTop - a.yTop) < ROW_Y_TOL * 2 && Math.abs(prev.yBot - a.yBot) < ROW_Y_TOL * 3) {
      prev.yTop = Math.max(prev.yTop, a.yTop);
      prev.yBot = Math.min(prev.yBot, a.yBot);
      if (a.text.length > prev.text.length) prev.text = a.text;
      continue;
    }
    deduped.push({ ...a });
  }
  return deduped;
}

/**
 * Bandas verticales: contenido entre título superior e inferior (lectura PDF, y mayor = más arriba).
 */
function buildSemanticYBands(anchors, items) {
  if (!anchors.length) return [];
  const ys = items.map((it) => it.y);
  const yMax = Math.max(...ys);
  const yMin = Math.min(...ys);
  const bands = [];
  const first = anchors[0];
  if (first.yTop + ANCHOR_Y_PAD < yMax - ANCHOR_MIN_BAND_HEIGHT) {
    bands.push({ yLo: first.yTop + ANCHOR_Y_PAD, yHi: yMax + 50, kind: 'above-first-anchor' });
  }
  for (let i = 0; i < anchors.length - 1; i++) {
    const upper = anchors[i];
    const lower = anchors[i + 1];
    if (upper.yBot - ANCHOR_Y_PAD <= lower.yTop + ANCHOR_Y_PAD) continue;
    if (upper.yBot - lower.yTop < ANCHOR_MIN_SEP) continue;
    bands.push({
      yLo: lower.yTop + ANCHOR_Y_PAD,
      yHi: upper.yBot - ANCHOR_Y_PAD,
      kind: 'between-anchors',
    });
  }
  const last = anchors[anchors.length - 1];
  if (last.yBot - ANCHOR_Y_PAD > yMin + ANCHOR_MIN_BAND_HEIGHT) {
    bands.push({ yLo: yMin - 50, yHi: last.yBot - ANCHOR_Y_PAD, kind: 'below-last-anchor' });
  }
  return bands.filter((b) => b.yHi - b.yLo >= ANCHOR_MIN_BAND_HEIGHT);
}

function itemYInBand(it, yLo, yHi) {
  return it.y >= yLo && it.y <= yHi;
}

function rectOverlapsVerticalBand(r, yLo, yHi) {
  const r1 = Math.min(r.y1, r.y2);
  const r2 = Math.max(r.y1, r.y2);
  return !(r2 < yLo || r1 > yHi);
}

function sliceItemsAndRectsByBand(items, rects, yLo, yHi) {
  const subItems = items.filter((it) => itemYInBand(it, yLo, yHi));
  const subRects = rects.filter((r) => rectOverlapsVerticalBand(r, yLo, yHi));
  return { items: subItems, rects: subRects };
}

function buildSemanticSlicesOrFull(items, rects) {
  const anchors = detectSemanticAnchors(items);
  const fullFallback = {
    slices: [{ items, rects, anchorMode: false, band: null }],
    anchors,
  };
  if (anchors.length < 2) return fullFallback;
  const bands = buildSemanticYBands(anchors, items);
  if (!bands.length) return fullFallback;
  bands.sort((a, b) => b.yHi - a.yHi);
  const slices = [];
  for (const b of bands) {
    const { items: si, rects: sr } = sliceItemsAndRectsByBand(items, rects, b.yLo, b.yHi);
    if (si.length < ANCHOR_SLICE_MIN_ITEMS) continue;
    slices.push({ items: si, rects: sr, anchorMode: true, band: b });
  }
  if (!slices.length) return fullFallback;
  return { slices, anchors };
}

/**
 * Extrae tablas de un subconjunto ya recortado por Y (una banda ancla o documento completo).
 */
async function extractTablesFromItemRectSlice(items, rects, debug, options = {}) {
  const anchorMode = !!options.anchorMode;
  let tables = [];
  let debugInfo = null;
  const grid = tryBuildGridFromRectangles(rects);
  if (grid) {
    const rowBuckets = bucketRows(items);
    const yLinesFromBorders = [...grid.yLines].sort((a, b) => b - a);
    const assignedMatrix = assignItemsToGridCells(items, grid.xLines, yLinesFromBorders);
    const { matrix: trimmedMatrix, yLines: trimmedYLines } = clearCellsOutsideTableRects(
      assignedMatrix,
      grid.xLines,
      yLinesFromBorders,
      rects
    );
    const matrixByBorders = expandValuesAcrossMergedRects(
      trimmedMatrix,
      grid.xLines,
      trimmedYLines,
      rects
    );
    const textRows = bucketRows(items);
    const textBlocks = splitRowBlocksByVerticalGaps(textRows);
    const blocks = chooseBorderTableBlocks(matrixByBorders, trimmedYLines, textBlocks, { anchorMode });
    tables = blocks.map((celdas, i) => {
      const cleanedBase = stabilizeLeftColumns(removeCompletelyEmptyRows(trimTrailingEmptyRows(celdas)));
      const cleanedFilled = forwardFillLeftColumns(cleanedBase, LEFT_COLS);
      const cleanedMergedHeaders = expandMergedHeadersAndSpans(cleanedFilled, LEFT_COLS);
      const normalizedSubrows = normalizeMergedSubrows(cleanedMergedHeaders, LEFT_COLS);
      const collapsed = collapseStandaloneLargeRows(normalizedSubrows, LEFT_COLS);
      const sectioned = propagateSectionHeaders(collapsed, LEFT_COLS);
      const aligned = alignLeftColumnsByStructure(sectioned, LEFT_COLS);
      const stripped = stripExamenesGeneralesDecoration(fillGroupByVerticalContinuity(aligned, LEFT_COLS));
      const cleaned = clearLeftCellsBeforePrecioInRow(
        rebalanceSingleLeftCellToDominantColumn(stripped, LEFT_COLS)
      );
      const hierarchy = buildLeftHierarchy(cleaned, LEFT_COLS);
      return {
        id: i + 1,
        nombre: tableNameFromBlock(cleaned.map((cells) => ({ cells })), `Tabla ${i + 1}`),
        filas: cleaned.length,
        columnas: maxColsOf(cleaned),
        celdas: cleaned,
        leftHierarchy: hierarchy,
      };
    });
    if (debug) {
      debugInfo = {
        method: 'borders+x-columns',
        xLines: grid.xLines,
        yLinesSample: yLinesFromBorders.slice(0, 120),
        blockSizes: blocks.map((b) => b.length),
        textBlockSizes: textBlocks.map((b) => b.length),
        rectCount: rects.length,
        itemCount: items.length,
      };
    }
  }

  if (!tables.length) {
    const rows = bucketRows(items);
    const rightCenters = inferRightCenters(items);
    const gridRows = gridifyRows(rows, rightCenters);
    const blocks = splitRowBlocksByVerticalGaps(gridRows);
    tables = blocks.map((b, i) => {
      const base = stabilizeLeftColumns(removeCompletelyEmptyRows(trimTrailingEmptyRows(b.map((r) => r.cells))));
      const filled = forwardFillLeftColumns(base, LEFT_COLS);
      const mergedHeaders = expandMergedHeadersAndSpans(filled, LEFT_COLS);
      const normalizedSubrows = normalizeMergedSubrows(mergedHeaders, LEFT_COLS);
      const collapsed = collapseStandaloneLargeRows(normalizedSubrows, LEFT_COLS);
      const sectioned = propagateSectionHeaders(collapsed, LEFT_COLS);
      const aligned = alignLeftColumnsByStructure(sectioned, LEFT_COLS);
      const stripped = stripExamenesGeneralesDecoration(fillGroupByVerticalContinuity(aligned, LEFT_COLS));
      const celdas = clearLeftCellsBeforePrecioInRow(rebalanceSingleLeftCellToDominantColumn(stripped, LEFT_COLS));
      const hierarchy = buildLeftHierarchy(celdas, LEFT_COLS);
      return {
        id: i + 1,
        nombre: tableNameFromBlock(b, `Tabla ${i + 1}`),
        filas: celdas.length,
        columnas: maxColsOf(celdas),
        celdas,
        leftHierarchy: hierarchy,
      };
    });
    if (debug) {
      debugInfo = {
        method: 'text-geometry-fallback',
        rightCenters: rightCenters || [],
        rowYs: rows.map((r) => Number(r.y.toFixed(2))),
        blockSizes: blocks.map((b) => b.length),
        rectCount: rects.length,
        itemCount: items.length,
      };
    }
  }

  tables = tables.filter(
    (t) => Array.isArray(t.celdas) && t.celdas.length > 0 && (t.columnas || maxColsOf(t.celdas)) > 1
  );
  return { tables, debugInfo };
}

/**
 * Elimina tablas diminutas (membretes, badges tipo "COTIZACIÓN/Fecha/Codificación", firmas, etc.)
 * cuando existe al menos una tabla dominante mucho mayor en el mismo documento.
 * Genérico por tamaño relativo: una tabla se conserva si tiene al menos el 15% del número
 * de celdas de la más grande o un mínimo absoluto de celdas con datos.
 */
function tableDataCellCount(t) {
  const rows = Array.isArray(t && t.celdas) ? t.celdas : [];
  let n = 0;
  for (const r of rows) {
    if (!Array.isArray(r)) continue;
    for (const c of r) {
      if (normalizeCell(c)) n += 1;
    }
  }
  return n;
}

function filterOutTinyMetadataTables(tables) {
  if (!Array.isArray(tables) || tables.length <= 1) return tables;
  const sizes = tables.map(tableDataCellCount);
  const maxSize = sizes.reduce((m, v) => (v > m ? v : m), 0);
  if (maxSize < 30) return tables;
  const minAbs = 10;
  return tables.filter((t, i) => sizes[i] >= minAbs);
}

async function extractPerfilPdfTablesFromBuffer(buffer, options = {}) {
  const debug = !!options.debug;
  const data = Buffer.isBuffer(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  const pdfjsLib = await getPdfjsLib();
  const task = pdfjsLib.getDocument({ data, useSystemFonts: true, disableFontFace: true, isEvalSupported: false });
  const pdf = await task.promise;
  try {
    const numpages = pdf.numPages || 0;
    if (numpages < 1) return { ok: true, numpages: 0, tables: [] };

    /** Todas las páginas: texto + rectángulos en un solo eje Y para tablas cortadas entre páginas. */
    const perPage = [];
    for (let pi = 1; pi <= numpages; pi++) {
      const page = await pdf.getPage(pi);
      const textContent = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
      const pageItems = parseItems(textContent);
      const pageRects = await extractRectanglesFromPage(page, pdfjsLib);
      perPage.push({ items: pageItems, rects: pageRects });
    }

    const mergedItems = [];
    const mergedRects = [];
    const stackGap =
      perPage[0] && perPage[0].items.length ? computeInterPageStackGap(perPage[0].items) : 10;

    for (let i = 0; i < perPage.length; i++) {
      const { items: rawItems, rects: rawRects } = perPage[i];
      if (!rawItems.length) continue;
      if (!mergedItems.length) {
        for (const it of rawItems) mergedItems.push({ ...it });
        for (const r of rawRects) mergedRects.push({ ...r });
        continue;
      }
      const deltaY = computeStackDeltaY(mergedItems, rawItems, stackGap);
      for (const it of rawItems) mergedItems.push({ ...it, y: it.y + deltaY });
      for (const r of rawRects) mergedRects.push({ ...r, y1: r.y1 + deltaY, y2: r.y2 + deltaY });
    }

    if (!mergedItems.length) return { ok: true, numpages, tables: [] };

    const { slices, anchors: semanticAnchors } = buildSemanticSlicesOrFull(mergedItems, mergedRects);
    const sliceDebugs = [];
    let tables = [];
    for (const slice of slices) {
      const { tables: part, debugInfo: d } = await extractTablesFromItemRectSlice(
        slice.items,
        slice.rects,
        debug,
        { anchorMode: !!slice.anchorMode }
      );
      tables.push(...part);
      if (debug && d) {
        sliceDebugs.push({
          anchorMode: slice.anchorMode,
          band: slice.band,
          itemCount: slice.items.length,
          rectCount: slice.rects.length,
          ...d,
        });
      }
    }

    tables = filterOutTinyMetadataTables(tables);
    tables.forEach((t, idx) => {
      t.id = idx + 1;
    });

    let debugInfo = null;
    if (debug) {
      debugInfo = {
        semanticAnchorSlices: slices.length,
        semanticAnchorsFound: semanticAnchors.map((a) => ({
          text: a.text,
          yTop: Number(a.yTop.toFixed(2)),
          yBot: Number(a.yBot.toFixed(2)),
        })),
        anchorSlicesDetail: sliceDebugs,
      };
    }

    if (debug) {
      return { ok: true, numpages, tables, debug: debugInfo };
    }
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

